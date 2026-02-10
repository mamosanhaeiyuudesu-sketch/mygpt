/**
 * 日記エントリのローカルストレージ管理
 */
import type { DiaryEntry } from '~/types';

const DIARY_STORAGE_KEY = 'mygpt_diary';

/**
 * 日記エントリを読み込み（created_at DESC）
 */
export function loadDiaryEntries(userId: string): DiaryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(DIARY_STORAGE_KEY);
    if (data) {
      const all = JSON.parse(data) as DiaryEntry[];
      return all
        .filter(e => e.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (e) {
    console.error('Failed to load diary entries from localStorage:', e);
  }
  return [];
}

/**
 * 日記エントリを保存
 */
export function saveDiaryEntries(userId: string, entries: DiaryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    // 他のユーザーのエントリを保持
    const data = localStorage.getItem(DIARY_STORAGE_KEY);
    const existing = data ? (JSON.parse(data) as DiaryEntry[]) : [];
    const otherUsers = existing.filter(e => e.userId !== userId);
    const merged = [...otherUsers, ...entries];
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to save diary entries to localStorage:', e);
  }
}
