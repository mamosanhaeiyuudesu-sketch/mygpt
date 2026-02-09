/**
 * User データベース操作
 */
import type { H3Event } from 'h3';
import type { User } from './common';
import { getD1, memoryStore } from './common';

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

/**
 * ユーザー言語設定を更新
 */
export async function updateUserLanguage(
  event: H3Event,
  id: string,
  language: string
): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare(
      'UPDATE users SET language = ? WHERE id = ?'
    ).bind(language, id).run();
  } else {
    const user = memoryStore.users.find(u => u.id === id);
    if (user) user.language = language;
  }
}
