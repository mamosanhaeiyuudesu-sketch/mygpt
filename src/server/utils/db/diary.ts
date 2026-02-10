/**
 * 日記エントリ データベース操作
 */
import type { H3Event } from 'h3';
import { getD1, generateId, memoryStore } from './common';
import type { DiaryEntry } from './common';

/**
 * ユーザーの全日記エントリを取得（created_at DESC）
 */
export async function getAllDiaryEntries(event: H3Event, userId: string): Promise<DiaryEntry[]> {
  const db = getD1(event);
  if (db) {
    const result = await db.prepare(
      'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all<DiaryEntry>();
    return result.results || [];
  }
  return memoryStore.diaryEntries
    .filter(e => e.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);
}

/**
 * 日記エントリを作成
 */
export async function createDiaryEntry(
  event: H3Event,
  userId: string,
  content: string,
  duration?: number
): Promise<DiaryEntry> {
  const db = getD1(event);
  const id = generateId('diary');
  const now = Date.now();
  const entry: DiaryEntry = {
    id,
    user_id: userId,
    content,
    duration: duration ?? null,
    created_at: now,
  };

  if (db) {
    await db.prepare(
      'INSERT INTO diary_entries (id, user_id, content, duration, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, userId, content, duration ?? null, now).run();
  } else {
    memoryStore.diaryEntries.push(entry);
  }

  return entry;
}

/**
 * 日記エントリを削除
 */
export async function deleteDiaryEntry(event: H3Event, entryId: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('DELETE FROM diary_entries WHERE id = ?').bind(entryId).run();
  } else {
    const idx = memoryStore.diaryEntries.findIndex(e => e.id === entryId);
    if (idx !== -1) memoryStore.diaryEntries.splice(idx, 1);
  }
}
