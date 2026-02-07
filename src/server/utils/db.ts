/**
 * データベースユーティリティ
 * Cloudflare D1 (本番) / インメモリ (ローカル開発) 対応
 */
import type { H3Event } from 'h3';

export interface User {
  id: string;
  name: string;
  created_at: number;
}

export interface Chat {
  user_id: string;
  id: string;
  conversation_id: string;
  name: string;
  model?: string | null;
  system_prompt?: string | null;
  vector_store_id?: string | null;
  use_context?: boolean | null; // 文脈保持するかどうか（デフォルトtrue）
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

export interface Preset {
  id: string;
  name: string;
  model: string;
  system_prompt: string | null;
  vector_store_id: string | null;
  use_context: boolean;
  created_at: number;
}

// インメモリストレージ（ローカル開発用フォールバック）
const memoryStore = {
  users: [] as User[],
  chats: [] as Chat[],
  messages: [] as Message[],
  presets: [] as Preset[]
};

/**
 * D1データベースを取得（Cloudflare Workers環境のみ）
 */
function getD1(event: H3Event): D1Database | null {
  const cfEnv = event.context.cloudflare?.env as { DB?: D1Database } | undefined;
  return cfEnv?.DB || null;
}

/**
 * ユニークID生成
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ========== User Operations ==========

/**
 * ユーザー取得（ID）
 */
export async function getUserById(event: H3Event, id: string): Promise<User | null> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first() as User | null;
    return result;
  }

  return memoryStore.users.find(u => u.id === id) || null;
}

/**
 * ユーザー取得（名前）
 */
export async function getUserByName(event: H3Event, name: string): Promise<User | null> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(
      'SELECT * FROM users WHERE name = ?'
    ).bind(name).first() as User | null;
    return result;
  }

  return memoryStore.users.find(u => u.name === name) || null;
}

/**
 * ユーザー作成
 */
export async function createUser(
  event: H3Event,
  id: string,
  name: string
): Promise<User> {
  const now = Date.now();
  const user: User = {
    id,
    name,
    created_at: now
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO users (id, name, created_at)
      VALUES (?, ?, ?)
    `).bind(id, name, now).run();
  } else {
    memoryStore.users.push(user);
  }

  return user;
}

// ========== Chat Operations ==========

/**
 * 全チャット取得（ユーザーIDでフィルタ）
 */
export async function getAllChats(event: H3Event, userId: string): Promise<(Chat & { last_message?: string })[]> {
  const db = getD1(event);

  if (db) {
    // D1を使用
    const result = await db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.conversation_id,
        c.name,
        c.model,
        c.system_prompt,
        c.vector_store_id,
        c.use_context,
        c.created_at,
        c.updated_at,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chats c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `).bind(userId).all();

    return (result.results || []) as (Chat & { last_message?: string })[];
  }

  // インメモリ（ローカル開発用）
  return memoryStore.chats
    .filter(chat => chat.user_id === userId)
    .sort((a, b) => b.updated_at - a.updated_at)
    .map(chat => {
      const lastMsg = memoryStore.messages
        .filter(m => m.chat_id === chat.id)
        .sort((a, b) => b.created_at - a.created_at)[0];
      return { ...chat, last_message: lastMsg?.content };
    });
}

/**
 * チャット作成
 */
export async function createChat(
  event: H3Event,
  id: string,
  userId: string,
  conversationId: string,
  name: string,
  model?: string,
  systemPrompt?: string,
  vectorStoreId?: string,
  useContext: boolean = true
): Promise<Chat> {
  const now = Date.now();
  const chat: Chat = {
    id,
    user_id: userId,
    conversation_id: conversationId,
    name,
    model: model || null,
    system_prompt: systemPrompt || null,
    vector_store_id: vectorStoreId || null,
    use_context: useContext,
    created_at: now,
    updated_at: now
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO chats (id, user_id, conversation_id, name, model, system_prompt, vector_store_id, use_context, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, conversationId, name, model || null, systemPrompt || null, vectorStoreId || null, useContext ? 1 : 0, now, now).run();
  } else {
    memoryStore.chats.push(chat);
  }

  return chat;
}

/**
 * チャット取得
 */
export async function getChat(event: H3Event, id: string): Promise<Chat | null> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(
      'SELECT * FROM chats WHERE id = ?'
    ).bind(id).first() as Chat | null;
    return result;
  }

  return memoryStore.chats.find(c => c.id === id) || null;
}

/**
 * チャット削除
 */
export async function deleteChat(event: H3Event, id: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    // メッセージは CASCADE で自動削除される
    await db.prepare('DELETE FROM chats WHERE id = ?').bind(id).run();
  } else {
    memoryStore.chats = memoryStore.chats.filter(c => c.id !== id);
    memoryStore.messages = memoryStore.messages.filter(m => m.chat_id !== id);
  }
}

/**
 * チャット名更新
 */
export async function updateChatName(event: H3Event, id: string, name: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('UPDATE chats SET name = ? WHERE id = ?').bind(name, id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) chat.name = name;
  }
}

/**
 * チャット更新日時更新
 */
export async function updateChatTimestamp(event: H3Event, id: string, timestamp: number): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').bind(timestamp, id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) chat.updated_at = timestamp;
  }
}

/**
 * チャット設定更新（モデル・システムプロンプト・Vector Store ID・文脈保持）
 */
export async function updateChatSettings(
  event: H3Event,
  id: string,
  model?: string,
  systemPrompt?: string | null,
  vectorStoreId?: string | null,
  useContext?: boolean
): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare(
      'UPDATE chats SET model = ?, system_prompt = ?, vector_store_id = ?, use_context = ? WHERE id = ?'
    ).bind(model || null, systemPrompt ?? null, vectorStoreId ?? null, useContext === undefined ? 1 : (useContext ? 1 : 0), id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) {
      if (model !== undefined) chat.model = model || null;
      if (systemPrompt !== undefined) chat.system_prompt = systemPrompt ?? null;
      if (vectorStoreId !== undefined) chat.vector_store_id = vectorStoreId ?? null;
      if (useContext !== undefined) chat.use_context = useContext;
    }
  }
}

// ========== Message Operations ==========

/**
 * メッセージ取得
 */
export async function getMessages(event: H3Event, chatId: string): Promise<Message[]> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(`
      SELECT id, chat_id, role, content, created_at
      FROM messages
      WHERE chat_id = ?
      ORDER BY created_at ASC
    `).bind(chatId).all();

    return (result.results || []) as Message[];
  }

  return memoryStore.messages
    .filter(m => m.chat_id === chatId)
    .sort((a, b) => a.created_at - b.created_at);
}

/**
 * メッセージ作成
 */
export async function createMessage(
  event: H3Event,
  id: string,
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
  createdAt: number
): Promise<Message> {
  const message: Message = {
    id,
    chat_id: chatId,
    role,
    content,
    created_at: createdAt
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO messages (id, chat_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, chatId, role, content, createdAt).run();
  } else {
    memoryStore.messages.push(message);
  }

  return message;
}

// ========== Preset Operations ==========

/**
 * 全プリセット取得
 */
export async function getAllPresets(event: H3Event): Promise<Preset[]> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(`
      SELECT id, name, model, system_prompt, vector_store_id, use_context, created_at
      FROM presets
      ORDER BY created_at ASC
    `).all();

    return ((result.results || []) as Array<Omit<Preset, 'use_context'> & { use_context: number }>).map(p => ({
      ...p,
      use_context: p.use_context === 1
    }));
  }

  // インメモリ（ローカル開発用）
  return [...memoryStore.presets].sort((a, b) => a.created_at - b.created_at);
}

/**
 * プリセット作成
 */
export async function createPreset(
  event: H3Event,
  id: string,
  name: string,
  model: string,
  systemPrompt: string | null,
  vectorStoreId: string | null,
  useContext: boolean
): Promise<Preset> {
  const now = Date.now();
  const preset: Preset = {
    id,
    name,
    model,
    system_prompt: systemPrompt,
    vector_store_id: vectorStoreId,
    use_context: useContext,
    created_at: now
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO presets (id, name, model, system_prompt, vector_store_id, use_context, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, model, systemPrompt, vectorStoreId, useContext ? 1 : 0, now).run();
  } else {
    memoryStore.presets.push(preset);
  }

  return preset;
}

/**
 * プリセット削除
 */
export async function deletePreset(event: H3Event, id: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('DELETE FROM presets WHERE id = ?').bind(id).run();
  } else {
    memoryStore.presets = memoryStore.presets.filter(p => p.id !== id);
  }
}
