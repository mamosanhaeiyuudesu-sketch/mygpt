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
      'SELECT * FROM diaries WHERE user_id = ? ORDER BY created_at DESC'
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
  duration?: number,
  title?: string
): Promise<DiaryEntry> {
  const db = getD1(event);
  const id = crypto.randomUUID();
  const now = Date.now();
  const entryTitle = title || content.substring(0, 30).replace(/\n/g, ' ');
  const entry: DiaryEntry = {
    id,
    user_id: userId,
    title: entryTitle,
    content,
    duration: duration ?? null,
    created_at: now,
  };

  if (db) {
    await db.prepare(
      'INSERT INTO diaries (id, user_id, title, content, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, userId, entryTitle, content, duration ?? null, now).run();
  } else {
    memoryStore.diaryEntries.push(entry);
  }

  return entry;
}

/**
 * 日記エントリを1件取得
 */
export async function getDiaryEntry(event: H3Event, entryId: string): Promise<DiaryEntry | null> {
  const db = getD1(event);
  if (db) {
    return await db.prepare('SELECT * FROM diaries WHERE id = ?').bind(entryId).first() as DiaryEntry | null;
  }
  return memoryStore.diaryEntries.find(e => e.id === entryId) || null;
}

/**
 * 日記エントリのタイトルを更新
 */
export async function renameDiaryEntry(event: H3Event, entryId: string, title: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('UPDATE diaries SET title = ? WHERE id = ?').bind(title, entryId).run();
  } else {
    const entry = memoryStore.diaryEntries.find(e => e.id === entryId);
    if (entry) entry.title = title;
  }
}

/**
 * 日記エントリのコンテンツを更新
 */
export async function updateDiaryContent(event: H3Event, entryId: string, content: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('UPDATE diaries SET content = ? WHERE id = ?').bind(content, entryId).run();
  } else {
    const entry = memoryStore.diaryEntries.find(e => e.id === entryId);
    if (entry) entry.content = content;
  }
}

/**
 * 日記エントリを削除
 */
export async function deleteDiaryEntry(event: H3Event, entryId: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('DELETE FROM diaries WHERE id = ?').bind(entryId).run();
  } else {
    const idx = memoryStore.diaryEntries.findIndex(e => e.id === entryId);
    if (idx !== -1) memoryStore.diaryEntries.splice(idx, 1);
  }
}
