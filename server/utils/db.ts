/**
 * シンプルなインメモリデータベース（ローカル開発用）
 * サーバー再起動でデータはリセットされます
 */

export interface Chat {
  id: string;
  conversation_id: string;
  name: string;
  model: string; // 使用するOpenAIモデル
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

// インメモリストレージ
const store = {
  chats: [] as Chat[],
  messages: [] as Message[]
};

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Chat operations
export function getAllChats(): (Chat & { last_message?: string })[] {
  return store.chats
    .sort((a, b) => b.updated_at - a.updated_at)
    .map(chat => {
      const lastMsg = store.messages
        .filter(m => m.chat_id === chat.id)
        .sort((a, b) => b.created_at - a.created_at)[0];
      return {
        ...chat,
        last_message: lastMsg?.content
      };
    });
}

export function createChat(id: string, conversationId: string, name: string, model: string): Chat {
  const now = Date.now();
  const chat: Chat = {
    id,
    conversation_id: conversationId,
    name,
    model,
    created_at: now,
    updated_at: now
  };
  store.chats.push(chat);
  return chat;
}

export function getChat(id: string): Chat | undefined {
  return store.chats.find(c => c.id === id);
}

export function deleteChat(id: string): void {
  store.chats = store.chats.filter(c => c.id !== id);
  store.messages = store.messages.filter(m => m.chat_id !== id);
}

export function updateChatName(id: string, name: string): void {
  const chat = store.chats.find(c => c.id === id);
  if (chat) {
    chat.name = name;
  }
}

export function updateChatTimestamp(id: string, timestamp: number): void {
  const chat = store.chats.find(c => c.id === id);
  if (chat) {
    chat.updated_at = timestamp;
  }
}

// Message operations
export function getMessages(chatId: string): Message[] {
  return store.messages
    .filter(m => m.chat_id === chatId)
    .sort((a, b) => a.created_at - b.created_at);
}

export function createMessage(id: string, chatId: string, role: 'user' | 'assistant', content: string, createdAt: number): Message {
  const message: Message = {
    id,
    chat_id: chatId,
    role,
    content,
    created_at: createdAt
  };
  store.messages.push(message);
  return message;
}
