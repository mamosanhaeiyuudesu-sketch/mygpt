/**
 * デプロイ環境用チャット操作
 * API (D1) を使用
 */
import type { Chat, Message } from '~/types';
import type { ChatState, ChatOperations } from '~/composables/useChatLocal';
import { generateMessageId } from '~/utils/storage';
import { parseSSEStream, updateMessageContent } from '~/composables/useChatStream';

export function useChatRemote(state: ChatState): ChatOperations {
  const { chats, currentChatId, messages, isLoading, currentChatModel, currentChatUseContext } = state;

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json() as { chats: Chat[] };
        chats.value = data.chats;
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  };

  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean): Promise<string | undefined> => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chatName, model, systemPrompt, vectorStoreId, useContext: useContext !== false })
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const { chatId, conversationId, userId } = await response.json() as { chatId: string; conversationId: string; userId: string };

      const now = Date.now();
      const newChat: Chat = {
        id: chatId,
        userId,
        name: chatName,
        conversationId,
        model,
        systemPrompt,
        vectorStoreId,
        useContext: useContext !== false,
        createdAt: now,
        updatedAt: now
      };

      chats.value = [newChat, ...chats.value];
      await selectChat(chatId);

      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const selectChat = async (chatId: string) => {
    currentChatId.value = chatId;
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const data = await response.json() as { messages: Message[] };
        messages.value = data.messages;
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      messages.value = [];
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentChatId.value || !currentChatModel.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;
    const model = currentChatModel.value;
    const now = Date.now();

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content,
      createdAt: now
    };
    messages.value.push(userMessage);

    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now()
    };
    messages.value.push(assistantMessage);

    try {
      isLoading.value = true;

      const useContext = currentChatUseContext.value;
      const response = await fetch(`/api/chats/${chatId}/messages-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          model,
          useContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const finalContent = await parseSSEStream(reader, (text) => {
        updateMessageContent(messages, assistantMessage.id, text);
      });
      updateMessageContent(messages, assistantMessage.id, finalContent);

      // D1にメッセージを保存
      await fetch(`/api/chats/${chatId}/messages-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: content,
          assistantMessage: finalContent
        })
      });

      // チャット一覧を更新
      const chatIndex = chats.value.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        chats.value[chatIndex].lastMessage = finalContent.substring(0, 50);
        chats.value[chatIndex].updatedAt = Date.now();
        chats.value = [...chats.value].sort((a, b) => b.updatedAt - a.updatedAt);
      }
    } catch (error) {
      messages.value = messages.value.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id);
      console.error('Error sending message:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      chats.value = chats.value.filter(c => c.id !== chatId);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }

    if (currentChatId.value === chatId) {
      currentChatId.value = null;
      messages.value = [];
    }
  };

  const renameChat = async (chatId: string, name: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const chatIndex = chats.value.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        chats.value[chatIndex].name = name;
        chats.value = [...chats.value];
      }
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean) => {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, systemPrompt, vectorStoreId, useContext })
      });

      const chatIndex = chats.value.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        if (model !== undefined) chats.value[chatIndex].model = model;
        if (systemPrompt !== undefined) chats.value[chatIndex].systemPrompt = systemPrompt || undefined;
        if (vectorStoreId !== undefined) chats.value[chatIndex].vectorStoreId = vectorStoreId || undefined;
        if (useContext !== undefined) chats.value[chatIndex].useContext = useContext;
        chats.value = [...chats.value];
      }
    } catch (error) {
      console.error('Failed to update chat settings:', error);
    }
  };

  const reorderChats = async (fromIndex: number, toIndex: number) => {
    const sortedChats = [...chats.value];
    const [movedChat] = sortedChats.splice(fromIndex, 1);
    sortedChats.splice(toIndex, 0, movedChat);
    chats.value = sortedChats;
  };

  return {
    fetchChats,
    createChat,
    selectChat,
    sendMessage,
    deleteChat,
    renameChat,
    updateChatSettings,
    reorderChats
  };
}
