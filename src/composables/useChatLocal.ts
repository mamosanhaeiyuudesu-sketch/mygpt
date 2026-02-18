/**
 * ローカル環境用チャット操作
 * localStorage + Nuxtサーバールート（インメモリ）を使用
 */
import type { Ref, ComputedRef } from 'vue';
import type { Chat, Message, Persona } from '~/types';
import { getUserFromStorage, loadFromStorage, saveToStorage, generateUUID } from '~/utils/storage';
import { executeSendMessage } from '~/composables/useChatStream';

export interface ChatState {
  chats: Ref<Chat[]>;
  currentChatId: Ref<string | null>;
  messages: Ref<Message[]>;
  isLoading: Ref<boolean>;
  abortController: Ref<AbortController | null>;
  currentChatModel: ComputedRef<string | null>;
  currentChatSystemPrompt: ComputedRef<string | null>;
  currentChatVectorStoreId: ComputedRef<string | null>;
  currentChatUseContext: ComputedRef<boolean>;
}

export interface ChatOperations {
  fetchChats: () => Promise<void>;
  createChat: (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean, personaId?: string) => Promise<string | undefined>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, name: string) => Promise<void>;
  updateChatSettings: (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean, personaId?: string | null) => Promise<void>;
  reorderChats: (fromIndex: number, toIndex: number) => Promise<void>;
}

export function useChatLocal(state: ChatState): ChatOperations {
  const { chats, currentChatId, messages, isLoading, abortController, currentChatModel, currentChatSystemPrompt, currentChatVectorStoreId, currentChatUseContext } = state;

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

  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean, personaId?: string): Promise<string | undefined> => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      const user = getUserFromStorage();
      if (!user) {
        throw new Error('ログインが必要です');
      }

      const now = Date.now();
      const chatId = generateUUID();
      const newChat: Chat = {
        id: chatId,
        userId: user.id,
        title: chatName,
        model,
        systemPrompt,
        vectorStoreId,
        useContext: useContext !== false,
        personaId: personaId || null,
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
    const useContext = currentChatUseContext.value;

    // ペルソナIDがある場合、localStorageからペルソナのsystemPrompt/vectorStoreIdを動的取得
    const chat = chats.value.find(c => c.id === chatId);
    let systemPrompt = currentChatSystemPrompt.value;
    let vectorStoreId = currentChatVectorStoreId.value;
    if (chat?.personaId) {
      const personasData = localStorage.getItem('mygpt_personas');
      if (personasData) {
        const personas = JSON.parse(personasData) as Persona[];
        const persona = personas.find(p => p.id === chat.personaId);
        if (persona) {
          systemPrompt = persona.systemPrompt || null;
          vectorStoreId = persona.vectorStoreId || null;
        }
      }
    }

    // useContext時は過去メッセージ履歴を送信
    const history = useContext
      ? messages.value.map(m => ({ role: m.role, content: m.content }))
      : [];

    await executeSendMessage(content, {
      messages,
      isLoading,
      abortController,
      fetchStream: (msg, signal) => fetch('/api/messages-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history,
          message: msg,
          model,
          systemPrompt,
          vectorStoreId
        }),
        signal
      }),
      onSuccess: async (userMessage, finalContent) => {
        const updatedData = loadFromStorage();
        if (!updatedData.messages[chatId]) {
          updatedData.messages[chatId] = [];
        }
        updatedData.messages[chatId].push(userMessage);
        updatedData.messages[chatId].push({
          id: '',
          role: 'assistant',
          content: finalContent,
          createdAt: Date.now()
        });

        const chatIndex = updatedData.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
          updatedData.chats[chatIndex].lastMessage = finalContent.substring(0, 50);
          updatedData.chats[chatIndex].updatedAt = Date.now();
        }
        saveToStorage(updatedData);

        chats.value = updatedData.chats.sort((a, b) => b.updatedAt - a.updatedAt);
      },
      onError: (userMessage) => {
        const errorData = loadFromStorage();
        if (errorData.messages[chatId]) {
          errorData.messages[chatId] = errorData.messages[chatId].filter(m => m.id !== userMessage.id);
          saveToStorage(errorData);
        }
      }
    });
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
      data.chats[chatIndex].title = name;
      saveToStorage(data);
    }

    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean, personaId?: string | null) => {
    const data = loadFromStorage();
    const chatIndex = data.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      if (model !== undefined) data.chats[chatIndex].model = model;
      if (systemPrompt !== undefined) data.chats[chatIndex].systemPrompt = systemPrompt || undefined;
      if (vectorStoreId !== undefined) data.chats[chatIndex].vectorStoreId = vectorStoreId || undefined;
      if (useContext !== undefined) data.chats[chatIndex].useContext = useContext;
      if (personaId !== undefined) data.chats[chatIndex].personaId = personaId;
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
