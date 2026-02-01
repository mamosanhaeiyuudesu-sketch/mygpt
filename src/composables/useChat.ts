/**
 * MyGPT Chat Management Composable
 * ローカル環境: localStorage を使用
 * デプロイ環境: API (D1) を使用
 */

// 型定義
export interface Chat {
  id: string;
  name: string;
  conversationId: string; // OpenAI Conversation ID
  model: string; // 使用するOpenAIモデル
  systemPrompt?: string; // カスタムシステムプロンプト
  vectorStoreId?: string; // OpenAI Vector Store ID (RAG用)
  lastMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface StoredData {
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages
}

const STORAGE_KEY = 'mygpt_data';
const RETENTION_DAYS = 730; // 2年 = 730日
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * ローカル環境かどうかを判定
 */
function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * localStorage からデータを読み込む（期限切れのチャットを自動削除）
 */
function loadFromStorage(): StoredData {
  if (typeof window === 'undefined') {
    return { chats: [], messages: {} };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as StoredData;
      const now = Date.now();
      const cutoffTime = now - RETENTION_MS;

      // 期限切れのチャットをフィルタリング
      const expiredChatIds = parsed.chats
        .filter(chat => chat.updatedAt < cutoffTime)
        .map(chat => chat.id);

      if (expiredChatIds.length > 0) {
        console.log(`[Storage] Removing ${expiredChatIds.length} expired chats`);
        parsed.chats = parsed.chats.filter(chat => chat.updatedAt >= cutoffTime);
        // 期限切れチャットのメッセージも削除
        for (const chatId of expiredChatIds) {
          delete parsed.messages[chatId];
        }
        // クリーンアップしたデータを保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }

      return parsed;
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return { chats: [], messages: {} };
}

/**
 * localStorage にデータを保存
 */
function saveToStorage(data: StoredData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * ユニークID生成
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export const useChat = () => {
  // 状態管理
  const chats = ref<Chat[]>([]);
  const currentChatId = ref<string | null>(null);
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  // 現在のチャットの conversationId を取得
  const currentConversationId = computed(() => {
    if (!currentChatId.value) return null;
    const chat = chats.value.find(c => c.id === currentChatId.value);
    return chat?.conversationId || null;
  });

  // 現在のチャットのモデルを取得
  const currentChatModel = computed(() => {
    if (!currentChatId.value) return null;
    const chat = chats.value.find(c => c.id === currentChatId.value);
    return chat?.model || null;
  });

  // 現在のチャットのシステムプロンプトを取得
  const currentChatSystemPrompt = computed(() => {
    if (!currentChatId.value) return null;
    const chat = chats.value.find(c => c.id === currentChatId.value);
    return chat?.systemPrompt || null;
  });

  // 現在のチャットのVector Store IDを取得
  const currentChatVectorStoreId = computed(() => {
    if (!currentChatId.value) return null;
    const chat = chats.value.find(c => c.id === currentChatId.value);
    return chat?.vectorStoreId || null;
  });

  /**
   * チャット一覧を読み込む
   */
  const fetchChats = async () => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage から読み込む
      const data = loadFromStorage();
      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // デプロイ: API から読み込む
      try {
        const response = await fetch('/api/chats');
        if (response.ok) {
          const data = await response.json() as { chats: Array<{ id: string; name: string; lastMessage: string; updatedAt: number }> };
          chats.value = data.chats.map(c => ({
            id: c.id,
            name: c.name,
            conversationId: '', // APIから取得時は不要（selectChatで取得）
            model: '', // APIから取得時は不要
            lastMessage: c.lastMessage,
            createdAt: c.updatedAt,
            updatedAt: c.updatedAt
          }));
        }
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      }
    }
  };

  /**
   * 新しいチャットを作成
   * @param model - 使用するOpenAIモデル（必須）
   * @param name - チャット名（オプション）
   * @param systemPrompt - カスタムシステムプロンプト（オプション）
   * @param vectorStoreId - Vector Store ID（RAG用、オプション）
   */
  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string) => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      if (isLocalEnvironment()) {
        // ローカル: OpenAI Conversation作成 + localStorage保存
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
        const chatId = generateId('chat');
        const newChat: Chat = {
          id: chatId,
          name: chatName,
          conversationId,
          model,
          systemPrompt,
          vectorStoreId,
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
      } else {
        // デプロイ: API経由でD1に保存
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: chatName, model, systemPrompt, vectorStoreId })
        });

        if (!response.ok) {
          throw new Error('Failed to create chat');
        }

        const { chatId, conversationId } = await response.json() as { chatId: string; conversationId: string };

        const now = Date.now();
        const newChat: Chat = {
          id: chatId,
          name: chatName,
          conversationId,
          model,
          systemPrompt,
          vectorStoreId,
          createdAt: now,
          updatedAt: now
        };

        chats.value = [newChat, ...chats.value];
        await selectChat(chatId);

        return chatId;
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * チャットを選択してメッセージ履歴を取得
   */
  const selectChat = async (chatId: string) => {
    currentChatId.value = chatId;

    if (isLocalEnvironment()) {
      // ローカル: localStorage からメッセージを読み込む
      const data = loadFromStorage();
      messages.value = data.messages[chatId] || [];
    } else {
      // デプロイ: API からメッセージを読み込む
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
    }
  };

  /**
   * メッセージを送信
   */
  const sendMessage = async (content: string) => {
    if (!currentChatId.value || !currentChatModel.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;
    const model = currentChatModel.value;
    const systemPrompt = currentChatSystemPrompt.value;
    const vectorStoreId = currentChatVectorStoreId.value;
    const now = Date.now();

    // ユーザーメッセージを作成して即座に表示
    const userMessage: Message = {
      id: generateId('msg'),
      role: 'user',
      content,
      createdAt: now
    };
    messages.value.push(userMessage);

    if (isLocalEnvironment()) {
      // ローカル: localStorage に保存
      const data = loadFromStorage();
      if (!data.messages[chatId]) {
        data.messages[chatId] = [];
      }
      data.messages[chatId].push(userMessage);
      saveToStorage(data);
    }

    try {
      isLoading.value = true;

      if (isLocalEnvironment()) {
        // ローカル: /api/messages を使用
        const conversationId = currentConversationId.value;
        if (!conversationId) {
          throw new Error('No conversation ID');
        }

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            message: content,
            model,
            systemPrompt,
            vectorStoreId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const { content: assistantContent } = await response.json() as { content: string };

        const assistantMessage: Message = {
          id: generateId('msg'),
          role: 'assistant',
          content: assistantContent,
          createdAt: Date.now()
        };
        messages.value.push(assistantMessage);

        // localStorage に保存
        const updatedData = loadFromStorage();
        updatedData.messages[chatId].push(assistantMessage);

        const chatIndex = updatedData.chats.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
          updatedData.chats[chatIndex].lastMessage = assistantContent.substring(0, 50);
          updatedData.chats[chatIndex].updatedAt = Date.now();
        }
        saveToStorage(updatedData);

        chats.value = updatedData.chats.sort((a, b) => b.updatedAt - a.updatedAt);
      } else {
        // デプロイ: /api/chats/:id/messages を使用（D1に保存）
        const response = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            model
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const assistantMessage = await response.json() as Message;
        messages.value.push(assistantMessage);

        // チャット一覧を更新
        const chatIndex = chats.value.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
          chats.value[chatIndex].lastMessage = assistantMessage.content.substring(0, 50);
          chats.value[chatIndex].updatedAt = Date.now();
          chats.value = [...chats.value].sort((a, b) => b.updatedAt - a.updatedAt);
        }
      }
    } catch (error) {
      // エラー時はユーザーメッセージを削除
      messages.value = messages.value.filter(m => m.id !== userMessage.id);

      if (isLocalEnvironment()) {
        const errorData = loadFromStorage();
        errorData.messages[chatId] = errorData.messages[chatId].filter(m => m.id !== userMessage.id);
        saveToStorage(errorData);
      }

      console.error('Error sending message:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * チャットを削除
   */
  const deleteChat = async (chatId: string) => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage から削除
      const data = loadFromStorage();
      data.chats = data.chats.filter(c => c.id !== chatId);
      delete data.messages[chatId];
      saveToStorage(data);

      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // デプロイ: API経由で削除
      try {
        await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
        chats.value = chats.value.filter(c => c.id !== chatId);
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    }

    if (currentChatId.value === chatId) {
      currentChatId.value = null;
      messages.value = [];
    }
  };

  /**
   * チャット名を変更
   */
  const renameChat = async (chatId: string, name: string) => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage を更新
      const data = loadFromStorage();
      const chatIndex = data.chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        data.chats[chatIndex].name = name;
        saveToStorage(data);
      }

      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // デプロイ: API経由で更新
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
    }
  };

  /**
   * チャット設定を変更（モデル・システムプロンプト・Vector Store ID）
   */
  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null) => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage を更新
      const data = loadFromStorage();
      const chatIndex = data.chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        if (model !== undefined) data.chats[chatIndex].model = model;
        if (systemPrompt !== undefined) data.chats[chatIndex].systemPrompt = systemPrompt || undefined;
        if (vectorStoreId !== undefined) data.chats[chatIndex].vectorStoreId = vectorStoreId || undefined;
        saveToStorage(data);
      }

      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // デプロイ: API経由で更新
      try {
        await fetch(`/api/chats/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, systemPrompt, vectorStoreId })
        });

        const chatIndex = chats.value.findIndex(c => c.id === chatId);
        if (chatIndex !== -1) {
          if (model !== undefined) chats.value[chatIndex].model = model;
          if (systemPrompt !== undefined) chats.value[chatIndex].systemPrompt = systemPrompt || undefined;
          if (vectorStoreId !== undefined) chats.value[chatIndex].vectorStoreId = vectorStoreId || undefined;
          chats.value = [...chats.value];
        }
      } catch (error) {
        console.error('Failed to update chat settings:', error);
      }
    }
  };

  /**
   * チャットの順番を変更（ドラッグ&ドロップ用）
   */
  const reorderChats = async (fromIndex: number, toIndex: number) => {
    if (isLocalEnvironment()) {
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
    } else {
      // デプロイ環境では updatedAt でソートされるため、
      // フロントエンドでの並び替えは一時的なものになる
      const sortedChats = [...chats.value];
      const [movedChat] = sortedChats.splice(fromIndex, 1);
      sortedChats.splice(toIndex, 0, movedChat);
      chats.value = sortedChats;
    }
  };

  return {
    // State
    chats,
    currentChatId,
    currentChatModel,
    currentChatSystemPrompt,
    currentChatVectorStoreId,
    messages,
    isLoading,

    // Methods
    fetchChats,
    createChat,
    selectChat,
    sendMessage,
    deleteChat,
    renameChat,
    updateChatSettings,
    reorderChats
  };
};
