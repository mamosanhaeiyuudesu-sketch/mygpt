/**
 * デプロイ環境用チャット操作
 * API (D1) を使用
 */
import type { Chat, Message } from '~/types';
import type { ChatState, ChatOperations } from '~/composables/useChatLocal';
import { executeSendMessage } from '~/composables/useChatStream';

export function useChatRemote(state: ChatState): ChatOperations {
  const { chats, currentChatId, messages, isLoading, abortController, currentChatModel, currentChatUseContext } = state;

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

  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean, personaId?: string): Promise<string | undefined> => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chatName, model, systemPrompt, vectorStoreId, useContext: useContext !== false, personaId })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Failed to create chat: ${response.status} ${errorBody}`);
      }

      const { chatId, userId } = await response.json() as { chatId: string; userId: string };

      const now = Date.now();
      const newChat: Chat = {
        id: chatId,
        userId,
        name: chatName,
        model,
        systemPrompt,
        vectorStoreId,
        useContext: useContext !== false,
        personaId: personaId || null,
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
    const useContext = currentChatUseContext.value;

    await executeSendMessage(content, {
      messages,
      isLoading,
      abortController,
      fetchStream: (msg, signal) => fetch(`/api/chats/${chatId}/messages-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          model,
          useContext
        }),
        signal
      }),
      onSuccess: async (_userMessage, finalContent) => {
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
      }
    });
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

  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean, personaId?: string | null) => {
    try {
      await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, systemPrompt, vectorStoreId, useContext, personaId })
      });

      const chatIndex = chats.value.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        if (model !== undefined) chats.value[chatIndex].model = model;
        if (systemPrompt !== undefined) chats.value[chatIndex].systemPrompt = systemPrompt || undefined;
        if (vectorStoreId !== undefined) chats.value[chatIndex].vectorStoreId = vectorStoreId || undefined;
        if (useContext !== undefined) chats.value[chatIndex].useContext = useContext;
        if (personaId !== undefined) chats.value[chatIndex].personaId = personaId;
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
