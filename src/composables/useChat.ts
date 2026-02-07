/**
 * MyGPT Chat Management Composable
 * ローカル環境: localStorage を使用
 * デプロイ環境: API (D1) を使用
 */
import type { Chat, Message, StoredData, User } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';

// 型を再エクスポート（既存コードとの互換性のため）
export type { Chat, Message };

/**
 * localStorage からユーザーを取得
 */
function getUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('mygpt_data');
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.user || null;
    }
  } catch (e) {
    console.error('Failed to load user from localStorage:', e);
  }
  return null;
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
 * UUID v4 生成
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * メッセージID生成（内部用）
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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

  // 現在のチャットの文脈保持設定を取得
  const currentChatUseContext = computed(() => {
    if (!currentChatId.value) return true;
    const chat = chats.value.find(c => c.id === currentChatId.value);
    return chat?.useContext ?? true;
  });

  /**
   * チャット一覧を読み込む
   */
  const fetchChats = async () => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage から読み込む（ユーザーでフィルタ）
      const user = getUserFromStorage();
      if (!user) {
        chats.value = [];
        return;
      }
      const data = loadFromStorage();
      chats.value = data.chats
        .filter(chat => chat.userId === user.id)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } else {
      // デプロイ: API から読み込む（APIがユーザーでフィルタ）
      try {
        const response = await fetch('/api/chats');
        if (response.ok) {
          const data = await response.json() as { chats: Chat[] };
          chats.value = data.chats;
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
   * @param useContext - 文脈保持するかどうか（デフォルトtrue）
   */
  const createChat = async (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext: boolean = true) => {
    try {
      isLoading.value = true;
      const chatName = name || 'New Chat';

      if (isLocalEnvironment()) {
        // ローカル: OpenAI Conversation作成 + localStorage保存
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
          useContext,
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
          body: JSON.stringify({ name: chatName, model, systemPrompt, vectorStoreId, useContext })
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
          useContext,
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
   * SSEストリームからテキストを抽出するパーサー
   */
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (text: string) => void
  ): Promise<string> => {
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            // Responses APIのストリーミング形式に対応
            if (parsed.type === 'response.output_text.delta' && parsed.delta) {
              fullContent += parsed.delta;
              onChunk(fullContent);
            }
          } catch {
            // JSON解析エラーは無視
          }
        }
      }
    }

    return fullContent;
  };

  /**
   * メッセージを送信（ストリーミング対応）
   */
  const sendMessage = async (content: string) => {
    if (!currentChatId.value || !currentChatModel.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;
    const model = currentChatModel.value;
    const systemPrompt = currentChatSystemPrompt.value;
    const vectorStoreId = currentChatVectorStoreId.value;
    const useContext = currentChatUseContext.value;
    const now = Date.now();

    // ユーザーメッセージを作成して即座に表示
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content,
      createdAt: now
    };
    messages.value.push(userMessage);

    // アシスタントメッセージのプレースホルダーを作成
    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: '',
      createdAt: Date.now()
    };
    messages.value.push(assistantMessage);

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
        // ローカル: /api/messages-stream を使用（ストリーミング）
        const conversationId = currentConversationId.value;
        if (!conversationId) {
          throw new Error('No conversation ID');
        }

        const response = await fetch('/api/messages-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            message: content,
            model,
            systemPrompt,
            vectorStoreId,
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

        // ストリーミングでメッセージを更新
        const finalContent = await parseSSEStream(reader, (text) => {
          const msgIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
          if (msgIndex !== -1) {
            // リアクティビティを確実にトリガーするため新しい配列を作成
            messages.value = messages.value.map((m, i) =>
              i === msgIndex ? { ...m, content: text } : m
            );
          }
        });

        // 最終コンテンツを確定
        const msgIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (msgIndex !== -1) {
          messages.value = messages.value.map((m, i) =>
            i === msgIndex ? { ...m, content: finalContent } : m
          );
        }

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
      } else {
        // デプロイ: /api/chats/:id/messages-stream を使用（ストリーミング）
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

        // ストリーミングでメッセージを更新
        const finalContent = await parseSSEStream(reader, (text) => {
          const msgIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
          if (msgIndex !== -1) {
            // リアクティビティを確実にトリガーするため新しい配列を作成
            messages.value = messages.value.map((m, i) =>
              i === msgIndex ? { ...m, content: text } : m
            );
          }
        });

        // 最終コンテンツを確定
        const msgIndex = messages.value.findIndex(m => m.id === assistantMessage.id);
        if (msgIndex !== -1) {
          messages.value = messages.value.map((m, i) =>
            i === msgIndex ? { ...m, content: finalContent } : m
          );
        }

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
    } catch (error) {
      // エラー時はユーザーメッセージとアシスタントメッセージを削除
      messages.value = messages.value.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id);

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
   * チャット設定を変更（モデル・システムプロンプト・Vector Store ID・文脈保持）
   */
  const updateChatSettings = async (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean) => {
    if (isLocalEnvironment()) {
      // ローカル: localStorage を更新
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
    } else {
      // デプロイ: API経由で更新
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
    currentChatUseContext,
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
