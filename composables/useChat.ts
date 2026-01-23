/**
 * MyGPT Chat Management Composable
 * チャット機能を管理するNuxt 3 Composable
 */

// 型定義
export interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export const useChat = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  // 状態管理
  const chats = ref<Chat[]>([]);
  const currentChatId = ref<string | null>(null);
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  /**
   * チャット一覧を取得
   */
  const fetchChats = async () => {
    try {
      const response = await fetch(`${apiBase}/api/chats`);
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      const data = await response.json();
      chats.value = data.chats;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  };

  /**
   * 新しいチャットを作成
   */
  const createChat = async (name?: string) => {
    try {
      isLoading.value = true;
      const response = await fetch(`${apiBase}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || 'New Chat' })
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const data = await response.json();

      // チャット一覧を再取得
      await fetchChats();

      // 新しいチャットを選択
      await selectChat(data.chatId);

      return data.chatId;
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
    try {
      isLoading.value = true;
      currentChatId.value = chatId;

      const response = await fetch(`${apiBase}/api/chats/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      messages.value = data.messages;
    } catch (error) {
      console.error('Error selecting chat:', error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * メッセージを送信
   */
  const sendMessage = async (content: string) => {
    if (!currentChatId.value) {
      throw new Error('No chat selected');
    }

    const chatId = currentChatId.value;

    // 楽観的更新: ユーザーメッセージを即座に表示
    const optimisticUserMessage: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content,
      createdAt: Date.now()
    };
    messages.value.push(optimisticUserMessage);

    try {
      isLoading.value = true;

      const response = await fetch(`${apiBase}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const assistantMessage = await response.json();

      // 楽観的更新を削除し、実際のメッセージを追加
      messages.value = messages.value.filter(m => m.id !== optimisticUserMessage.id);

      // ユーザーメッセージを再追加（サーバーから返された正確なタイムスタンプで）
      messages.value.push({
        ...optimisticUserMessage,
        id: `msg_${Date.now()}_user`,
        createdAt: assistantMessage.createdAt - 1
      });

      // アシスタントメッセージを追加
      messages.value.push(assistantMessage);

      // チャット一覧を再取得（最終メッセージと更新日時を更新するため）
      await fetchChats();
    } catch (error) {
      // エラー時は楽観的更新をロールバック
      messages.value = messages.value.filter(m => m.id !== optimisticUserMessage.id);
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
    try {
      const response = await fetch(`${apiBase}/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // 現在のチャットが削除された場合、選択を解除
      if (currentChatId.value === chatId) {
        currentChatId.value = null;
        messages.value = [];
      }

      // チャット一覧を再取得
      await fetchChats();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  };

  /**
   * チャット名を変更
   */
  const renameChat = async (chatId: string, name: string) => {
    try {
      const response = await fetch(`${apiBase}/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error('Failed to rename chat');
      }

      // チャット一覧を再取得
      await fetchChats();
    } catch (error) {
      console.error('Error renaming chat:', error);
      throw error;
    }
  };

  return {
    // State
    chats,
    currentChatId,
    messages,
    isLoading,

    // Methods
    fetchChats,
    createChat,
    selectChat,
    sendMessage,
    deleteChat,
    renameChat
  };
};
