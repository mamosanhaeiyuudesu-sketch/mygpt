/**
 * MyGPT Chat Management Composable
 * ブラウザの localStorage を使用してチャットデータを永続化
 */

// 型定義
export interface Chat {
  id: string;
  name: string;
  conversationId: string; // OpenAI Conversation ID
  model: string; // 使用するOpenAIモデル
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

  /**
   * localStorage からチャット一覧を読み込む
   */
  const fetchChats = async () => {
    const data = loadFromStorage();
    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  /**
   * 新しいチャットを作成
   * @param model - 使用するOpenAIモデル（必須）
   * @param name - チャット名（オプション）
   */
  const createChat = async (model: string, name?: string) => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      // OpenAI Conversation を作成
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: chatName })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const { conversationId } = await response.json() as { conversationId: string };

      // 新しいチャットを作成
      const now = Date.now();
      const chatId = generateId('chat');
      const newChat: Chat = {
        id: chatId,
        name: chatName,
        conversationId,
        model,
        createdAt: now,
        updatedAt: now
      };

      // localStorage に保存
      const data = loadFromStorage();
      data.chats.push(newChat);
      data.messages[chatId] = [];
      saveToStorage(data);

      // 状態を更新
      chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);

      // 新しいチャットを選択
      await selectChat(chatId);

      return chatId;
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

    // localStorage からメッセージを読み込む
    const data = loadFromStorage();
    messages.value = data.messages[chatId] || [];
  };

  /**
   * メッセージを送信
   */
  const sendMessage = async (content: string) => {
    if (!currentChatId.value || !currentConversationId.value || !currentChatModel.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;
    const conversationId = currentConversationId.value;
    const model = currentChatModel.value;
    const now = Date.now();

    // ユーザーメッセージを作成して即座に表示
    const userMessage: Message = {
      id: generateId('msg'),
      role: 'user',
      content,
      createdAt: now
    };
    messages.value.push(userMessage);

    // localStorage に保存
    const data = loadFromStorage();
    if (!data.messages[chatId]) {
      data.messages[chatId] = [];
    }
    data.messages[chatId].push(userMessage);
    saveToStorage(data);

    try {
      isLoading.value = true;

      // OpenAI にメッセージを送信
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content,
          model
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { content: assistantContent } = await response.json() as { content: string };

      // アシスタントメッセージを作成
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

      // チャットの lastMessage と updatedAt を更新
      const chatIndex = updatedData.chats.findIndex(c => c.id === chatId);
      if (chatIndex !== -1) {
        updatedData.chats[chatIndex].lastMessage = assistantContent.substring(0, 50);
        updatedData.chats[chatIndex].updatedAt = Date.now();
      }
      saveToStorage(updatedData);

      // チャット一覧を更新
      chats.value = updatedData.chats.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      // エラー時はユーザーメッセージを削除
      messages.value = messages.value.filter(m => m.id !== userMessage.id);

      // localStorage からも削除
      const errorData = loadFromStorage();
      errorData.messages[chatId] = errorData.messages[chatId].filter(m => m.id !== userMessage.id);
      saveToStorage(errorData);

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
    // localStorage から削除
    const data = loadFromStorage();
    data.chats = data.chats.filter(c => c.id !== chatId);
    delete data.messages[chatId];
    saveToStorage(data);

    // 状態を更新
    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);

    // 現在のチャットが削除された場合、選択を解除
    if (currentChatId.value === chatId) {
      currentChatId.value = null;
      messages.value = [];
    }
  };

  /**
   * チャット名を変更
   */
  const renameChat = async (chatId: string, name: string) => {
    // localStorage を更新
    const data = loadFromStorage();
    const chatIndex = data.chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      data.chats[chatIndex].name = name;
      saveToStorage(data);
    }

    // 状態を更新
    chats.value = data.chats.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  /**
   * チャットの順番を変更（ドラッグ&ドロップ用）
   */
  const reorderChats = async (fromIndex: number, toIndex: number) => {
    const data = loadFromStorage();

    // 現在の並び順（updatedAtでソート済み）を取得
    const sortedChats = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt);

    // 要素を移動
    const [movedChat] = sortedChats.splice(fromIndex, 1);
    sortedChats.splice(toIndex, 0, movedChat);

    // updatedAt を調整して順番を維持
    // 一番上のチャットが最新になるように、上から順に新しいタイムスタンプを設定
    const now = Date.now();
    sortedChats.forEach((chat, index) => {
      chat.updatedAt = now - index;
    });

    // localStorage に保存
    data.chats = sortedChats;
    saveToStorage(data);

    // 状態を更新
    chats.value = sortedChats;
  };

  return {
    // State
    chats,
    currentChatId,
    currentChatModel,
    messages,
    isLoading,

    // Methods
    fetchChats,
    createChat,
    selectChat,
    sendMessage,
    deleteChat,
    renameChat,
    reorderChats
  };
};
