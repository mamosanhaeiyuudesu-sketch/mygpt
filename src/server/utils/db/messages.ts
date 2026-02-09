/**
 * Message データベース操作
 */
import type { H3Event } from 'h3';
import type { Message } from './common';
import { getD1, memoryStore } from './common';

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

    return (result.results || []) as unknown as Message[];
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
