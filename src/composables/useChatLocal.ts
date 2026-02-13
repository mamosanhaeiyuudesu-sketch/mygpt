/**
 * ローカル環境用チャット操作
 * localStorage + Nuxtサーバールート（インメモリ）を使用
 */
import type { Ref, ComputedRef } from 'vue';
import type { Chat, Message } from '~/types';
import { getUserFromStorage, loadFromStorage, saveToStorage, generateUUID, generateMessageId } from '~/utils/storage';
import { parseSSEStream, updateMessageContent } from '~/composables/useChatStream';

export interface ChatState {
  chats: Ref<Chat[]>;
  currentChatId: Ref<string | null>;
  messages: Ref<Message[]>;
  isLoading: Ref<boolean>;
  currentConversationId: ComputedRef<string | null>;
  currentChatModel: ComputedRef<string | null>;
  currentChatSystemPrompt: ComputedRef<string | null>;
  currentChatVectorStoreId: ComputedRef<string | null>;
  currentChatUseContext: ComputedRef<boolean>;
}

export interface ChatOperations {
  fetchChats: () => Promise<void>;
  createChat: (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean) => Promise<string | undefined>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, name: string) => Promise<void>;
  updateChatSettings: (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean) => Promise<void>;
  reorderChats: (fromIndex: number, toIndex: number) => Promise<void>;
}

export function useChatLocal(state: ChatState): ChatOperations {
  const { chats, currentChatId, messages, isLoading, currentConversationId, currentChatModel, currentChatSystemPrompt, currentChatVectorStoreId, currentChatUseContext } = state;

  const fetchChats = async () => {
    const user = getUserFromStorage();
    if (!user) {
      chats.value = [];
      return;
    }
    const data = loadFromStorage();
    chats.value = data.chats
      .filter(chat => chat.userId === user.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean): Promise<string | undefined> => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      const user = getUserFromStorage();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chatName })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const { conversationId } = await response.json() as { conversationId: string };

      const now = Date.now();
      const chatId = generateUUID();
      const newChat: Chat = {
        id: chatId,
        userId: user.id,
        name: chatName,
        conversationId,
        model,
        systemPrompt,
        vectorStoreId,
        useContext: useContext !== false,
        createdAt: now,
        updatedAt: now
      };

      const data = loadFromStorage();
      data.chats.push(newChat);
      data.messages[chatId] = [];
      saveToStorage(data);

      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
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
    const data = loadFromStorage();
    messages.value = data.messages[chatId] || [];
  };

  const sendMessage = async (content: string) => {
    if (!currentChatId.value || !currentChatModel.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;
    const model = currentChatModel.value;
    const systemPrompt = currentChatSystemPrompt.value;
    const vectorStoreId = currentChatVectorStoreId.value;
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

    // localStorage に保存
    const data = loadFromStorage();
    if (!data.messages[chatId]) {
      data.messages[chatId] = [];
    }
    data.messages[chatId].push(userMessage);
    saveToStorage(data);

    try {
      isLoading.value = true;

      const conversationId = currentConversationId.value;
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      const useContext = currentChatUseContext.value;
      const response = await fetch('/api/messages-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: useContext ? conversationId : undefined,
          message: content,
          model,
          systemPrompt,
          vectorStoreId
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

      // localStorage に保存
      const updatedData = loadFromStorage();
      updatedData.messages[chatId].push({
        ...assistantMessage,
        content: finalContent
      });

      const chatIndex = updatedData.chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        updatedData.chats[chatIndex].lastMessage = finalContent.substring(0, 50);
        updatedData.chats[chatIndex].updatedAt = Date.now();
      }
      saveToStorage(updatedData);

      chats.value = updatedData.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      messages.value = messages.value.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id);

      const errorData = loadFromStorage();
      errorData.messages[chatId] = errorData.messages[chatId].filter(m => m.id !== userMessage.id);
      saveToStorage(errorData);

      console.error('Error sending message:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteChat = async (chatId: string) => {
    const data = loadFromStorage();
    data.chats = data.chats.filter(c => c.id !== chatId);
    delete data.messages[chatId];
    saveToStorage(data);

    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);

    if (currentChatId.value === chatId) {
      currentChatId.value = null;
      messages.value = [];
    }
  };

  const renameChat = async (chatId: string, name: string) => {
    const data = loadFromStorage();
    const chatIndex = data.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      data.chats[chatIndex].name = name;
      saveToStorage(data);
    }

    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean) => {
    const data = loadFromStorage();
    const chatIndex = data.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      if (model !== undefined) data.chats[chatIndex].model = model;
      if (systemPrompt !== undefined) data.chats[chatIndex].systemPrompt = systemPrompt || undefined;
      if (vectorStoreId !== undefined) data.chats[chatIndex].vectorStoreId = vectorStoreId || undefined;
      if (useContext !== undefined) data.chats[chatIndex].useContext = useContext;
      saveToStorage(data);
    }

    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const reorderChats = async (fromIndex: number, toIndex: number) => {
    const data = loadFromStorage();
    const sortedChats = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt);

    const [movedChat] = sortedChats.splice(fromIndex, 1);
    sortedChats.splice(toIndex, 0, movedChat);

    const now = Date.now();
    sortedChats.forEach((chat, index) => {
      chat.updatedAt = now - index;
    });

    data.chats = sortedChats;
    saveToStorage(data);

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
