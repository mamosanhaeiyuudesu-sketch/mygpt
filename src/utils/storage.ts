/**
 * localStorage 共通ユーティリティ
 * useChat.ts と useAccount.ts で重複していたヘルパーを集約
 */
import type { User, StoredData } from '~/types';

export const STORAGE_KEY = 'mygpt_data';
const RETENTION_DAYS = 730; // 2年 = 730日
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/**
 * UUID v4 生成
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * メッセージID生成（内部用）
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * localStorage からユーザーを取得
 */
export function getUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.user || null;
    }
  } catch (e) {
    console.error('Failed to load user from localStorage:', e);
  }
  return null;
}

/**
 * localStorage からデータを読み込む（期限切れのチャットを自動削除）
 */
export function loadFromStorage(): StoredData {
  if (typeof window === 'undefined') {
    return { chats: [], messages: {} };
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as StoredData;
      const now = Date.now();
      const cutoffTime = now - RETENTION_MS;

      // 期限切れのチャットをフィルタリング
      const expiredChatIds = parsed.chats
        .filter(chat => chat.updatedAt < cutoffTime)
        .map(chat => chat.id);

      if (expiredChatIds.length > 0) {
        console.log(`[Storage] Removing ${expiredChatIds.length} expired chats`);
        parsed.chats = parsed.chats.filter(chat => chat.updatedAt >= cutoffTime);
        // 期限切れチャットのメッセージも削除
        for (const chatId of expiredChatIds) {
          delete parsed.messages[chatId];
        }
        // クリーンアップしたデータを保存
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }

      return parsed;
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return { chats: [], messages: {} };
}

/**
 * localStorage にデータを保存
 */
export function saveToStorage(data: StoredData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

/**
 * localStorage から保存されたアカウント一覧を取得
 */
export function getSavedAccountsFromStorage(): Record<string, User> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.savedAccounts || {};
    }
  } catch (e) {
    console.error('Failed to load saved accounts from localStorage:', e);
  }
  return {};
}

/**
 * localStorage にアカウントを保存
 */
export function saveAccountToStorage(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : { chats: [], messages: {}, savedAccounts: {} };
    if (!parsed.savedAccounts) {
      parsed.savedAccounts = {};
    }
    parsed.savedAccounts[user.name] = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error('Failed to save account to localStorage:', e);
  }
}

/**
 * localStorage にユーザーを保存
 */
export function saveUserToStorage(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : { chats: [], messages: {} };
    parsed.user = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error('Failed to save user to localStorage:', e);
  }
}

/**
 * localStorage から現在のログインユーザーをクリア（アカウント情報は残す）
 */
export function clearCurrentUserFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      delete parsed.user;
      // savedAccountsは残す
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Failed to clear current user from localStorage:', e);
  }
}

/**
 * 名前でアカウントを検索
 */
export function findAccountByName(name: string): User | null {
  const savedAccounts = getSavedAccountsFromStorage();
  return savedAccounts[name] || null;
}
