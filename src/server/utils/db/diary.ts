/**
 * 日記エントリ・セクション データベース操作
 */
import type { H3Event } from 'h3';
import { getD1, memoryStore } from './common';
import type { DiaryEntry, DiarySection } from './common';

/** エントリ + セクション配列 */
export interface DiaryEntryWithSections extends DiaryEntry {
  sections: DiarySection[];
}

/**
 * ユーザーの全日記エントリを取得（updated_at DESC）+ セクション
 */
export async function getAllDiaryEntries(event: H3Event, userId: string): Promise<DiaryEntryWithSections[]> {
  const db = getD1(event);
  if (db) {
    const entriesResult = await db.prepare(
      'SELECT * FROM diary_entries WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all<DiaryEntry>();
    const entries = entriesResult.results || [];

    if (entries.length === 0) return [];

    // 全エントリのセクションを一括取得
    const entryIds = entries.map(e => e.id);
    const placeholders = entryIds.map(() => '?').join(',');
    const sectionsResult = await db.prepare(
      `SELECT * FROM diary_sections WHERE entry_id IN (${placeholders}) ORDER BY completed_at ASC`
    ).bind(...entryIds).all<DiarySection>();
    const sections = sectionsResult.results || [];

    // エントリごとにセクションをグループ化
    const sectionsByEntry = new Map<string, DiarySection[]>();
    for (const s of sections) {
      const arr = sectionsByEntry.get(s.entry_id) || [];
      arr.push(s);
      sectionsByEntry.set(s.entry_id, arr);
    }

    return entries.map(e => ({
      ...e,
      sections: sectionsByEntry.get(e.id) || []
    }));
  }

  // インメモリフォールバック
  const entries = memoryStore.diaryEntries
    .filter(e => e.user_id === userId)
    .sort((a, b) => b.updated_at - a.updated_at);

  return entries.map(e => ({
    ...e,
    sections: memoryStore.diarySections
      .filter(s => s.entry_id === e.id)
      .sort((a, b) => a.completed_at - b.completed_at)
  }));
}

/**
 * 日記エントリを1件取得（セクション付き）
 */
export async function getDiaryEntry(event: H3Event, entryId: string): Promise<DiaryEntryWithSections | null> {
  const db = getD1(event);
  if (db) {
    const entry = await db.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(entryId).first() as DiaryEntry | null;
    if (!entry) return null;
    const sectionsResult = await db.prepare(
      'SELECT * FROM diary_sections WHERE entry_id = ? ORDER BY completed_at ASC'
    ).bind(entryId).all<DiarySection>();
    return { ...entry, sections: sectionsResult.results || [] };
  }
  const entry = memoryStore.diaryEntries.find(e => e.id === entryId);
  if (!entry) return null;
  return {
    ...entry,
    sections: memoryStore.diarySections
      .filter(s => s.entry_id === entryId)
      .sort((a, b) => a.completed_at - b.completed_at)
  };
}

/**
 * 日記エントリを作成（最初のセクション付き）
 */
export async function createDiaryEntry(
  event: H3Event,
  userId: string,
  text: string,
  title?: string,
  duration?: number
): Promise<DiaryEntryWithSections> {
  const db = getD1(event);
  const entryId = crypto.randomUUID();
  const sectionId = crypto.randomUUID();
  const now = Date.now();
  const entryTitle = title || text.substring(0, 30).replace(/\n/g, ' ');

  const entry: DiaryEntry = {
    id: entryId,
    user_id: userId,
    title: entryTitle,
    created_at: now,
    updated_at: now,
  };

  const section: DiarySection = {
    id: sectionId,
    entry_id: entryId,
    text,
    duration: duration ?? null,
    completed_at: now,
  };

  if (db) {
    await db.batch([
      db.prepare(
        'INSERT INTO diary_entries (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(entryId, userId, entryTitle, now, now),
      db.prepare(
        'INSERT INTO diary_sections (id, entry_id, text, duration, completed_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(sectionId, entryId, text, duration ?? null, now),
    ]);
  } else {
    memoryStore.diaryEntries.push(entry);
    memoryStore.diarySections.push(section);
  }

  return { ...entry, sections: [section] };
}

/**
 * 日記エントリにセクションを追加
 */
export async function addDiarySection(
  event: H3Event,
  entryId: string,
  text: string,
  duration?: number
): Promise<DiarySection> {
  const db = getD1(event);
  const sectionId = crypto.randomUUID();
  const now = Date.now();

  const section: DiarySection = {
    id: sectionId,
    entry_id: entryId,
    text,
    duration: duration ?? null,
    completed_at: now,
  };

  if (db) {
    await db.batch([
      db.prepare(
        'INSERT INTO diary_sections (id, entry_id, text, duration, completed_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(sectionId, entryId, text, duration ?? null, now),
      db.prepare(
        'UPDATE diary_entries SET updated_at = ? WHERE id = ?'
      ).bind(now, entryId),
    ]);
  } else {
    memoryStore.diarySections.push(section);
    const entry = memoryStore.diaryEntries.find(e => e.id === entryId);
    if (entry) entry.updated_at = now;
  }

  return section;
}

/**
 * 日記エントリのタイトルを更新
 */
export async function renameDiaryEntry(event: H3Event, entryId: string, title: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('UPDATE diary_entries SET title = ? WHERE id = ?').bind(title, entryId).run();
  } else {
    const entry = memoryStore.diaryEntries.find(e => e.id === entryId);
    if (entry) entry.title = title;
  }
}

/**
 * 日記エントリを削除（CASCADE削除でセクションも消える）
 */
export async function deleteDiaryEntry(event: H3Event, entryId: string): Promise<void> {
  const db = getD1(event);
  if (db) {
    await db.prepare('DELETE FROM diary_entries WHERE id = ?').bind(entryId).run();
  } else {
    const idx = memoryStore.diaryEntries.findIndex(e => e.id === entryId);
    if (idx !== -1) memoryStore.diaryEntries.splice(idx, 1);
    // セクションも削除
    const sectionIndices: number[] = [];
    memoryStore.diarySections.forEach((s, i) => {
      if (s.entry_id === entryId) sectionIndices.unshift(i);
    });
    for (const i of sectionIndices) {
      memoryStore.diarySections.splice(i, 1);
    }
  }
}
