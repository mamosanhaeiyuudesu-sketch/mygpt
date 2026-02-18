/**
 * Chat データベース操作
 */
import type { H3Event } from 'h3';
import type { Chat } from './common';
import { getD1, memoryStore } from './common';

/**
 * 全チャット取得（ユーザーIDでフィルタ）
 */
export async function getAllChats(event: H3Event, userId: string): Promise<(Chat & { last_message?: string })[]> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(`
      SELECT
        c.id,
        c.user_id,
        c.title,
        c.model,
        c.system_prompt,
        c.vector_store_id,
        c.use_context,
        c.persona_id,
        c.created_at,
        c.updated_at,
        (SELECT content FROM chat_messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chat_entries c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `).bind(userId).all();

    return (result.results || []) as unknown as (Chat & { last_message?: string })[];
  }

  return memoryStore.chats
    .filter(chat => chat.user_id === userId)
    .sort((a, b) => b.updated_at - a.updated_at)
    .map(chat => {
      const lastMsg = memoryStore.chatMessages
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
  title: string,
  model?: string,
  systemPrompt?: string,
  vectorStoreId?: string,
  useContext?: boolean,
  personaId?: string
): Promise<Chat> {
  const now = Date.now();
  const useContextValue = useContext !== false ? 1 : 0;
  const chat: Chat = {
    id,
    user_id: userId,
    title,
    model: model || null,
    system_prompt: systemPrompt || null,
    vector_store_id: vectorStoreId || null,
    use_context: useContext !== false ? 1 : 0,
    persona_id: personaId || null,
    created_at: now,
    updated_at: now
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO chat_entries (id, user_id, title, model, system_prompt, vector_store_id, use_context, persona_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, title, model || null, systemPrompt || null, vectorStoreId || null, useContextValue, personaId || null, now, now).run();
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
      'SELECT * FROM chat_entries WHERE id = ?'
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
    await db.prepare('DELETE FROM chat_entries WHERE id = ?').bind(id).run();
  } else {
    memoryStore.chats = memoryStore.chats.filter(c => c.id !== id);
    memoryStore.chatMessages = memoryStore.chatMessages.filter(m => m.chat_id !== id);
  }
}

/**
 * チャットタイトル更新
 */
export async function updateChatTitle(event: H3Event, id: string, title: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('UPDATE chat_entries SET title = ? WHERE id = ?').bind(title, id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) chat.title = title;
  }
}

/**
 * チャット更新日時更新
 */
export async function updateChatTimestamp(event: H3Event, id: string, timestamp: number): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('UPDATE chat_entries SET updated_at = ? WHERE id = ?').bind(timestamp, id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) chat.updated_at = timestamp;
  }
}

/**
 * チャット設定更新（モデル・システムプロンプト・Vector Store ID）
 */
export async function updateChatSettings(
  event: H3Event,
  id: string,
  model?: string,
  systemPrompt?: string | null,
  vectorStoreId?: string | null,
  useContext?: boolean,
  personaId?: string | null
): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare(
      'UPDATE chat_entries SET model = ?, system_prompt = ?, vector_store_id = ?, use_context = ?, persona_id = ? WHERE id = ?'
    ).bind(model || null, systemPrompt ?? null, vectorStoreId ?? null, useContext !== false ? 1 : 0, personaId ?? null, id).run();
  } else {
    const chat = memoryStore.chats.find(c => c.id === id);
    if (chat) {
      if (model !== undefined) chat.model = model || null;
      if (systemPrompt !== undefined) chat.system_prompt = systemPrompt ?? null;
      if (vectorStoreId !== undefined) chat.vector_store_id = vectorStoreId ?? null;
      if (useContext !== undefined) chat.use_context = useContext ? 1 : 0;
      if (personaId !== undefined) chat.persona_id = personaId ?? null;
    }
  }
}
