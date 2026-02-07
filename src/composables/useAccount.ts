/**
 * アカウント管理 Composable
 * ローカル環境: localStorage を使用
 * デプロイ環境: API (D1 + Cookie) を使用
 */
import type { User } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';

const STORAGE_KEY = 'mygpt_data';
const USER_COOKIE_NAME = 'mygpt_user_id';

/**
 * localStorage からユーザーを取得
 */
function getUserFromStorage(): User | null {
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
 * localStorage にユーザーを保存
 */
function saveUserToStorage(user: User): void {
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
 * localStorage からユーザーを削除
 */
function removeUserFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      delete parsed.user;
      // チャットとメッセージもクリア
      parsed.chats = [];
      parsed.messages = {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.error('Failed to remove user from localStorage:', e);
  }
}

/**
 * Cookie からユーザーIDを取得
 */
function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${USER_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * UUID v4 生成
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

// グローバル状態（シングルトン）
const currentUser = ref<User | null>(null);
const isLoading = ref(false);
const isInitialized = ref(false);

export const useAccount = () => {
  /**
   * 初期化: ユーザー情報を取得
   */
  const initialize = async (): Promise<User | null> => {
    if (isInitialized.value) {
      return currentUser.value;
    }

    isLoading.value = true;

    try {
      if (isLocalEnvironment()) {
        // ローカル: localStorage から取得
        currentUser.value = getUserFromStorage();
      } else {
        // デプロイ: Cookie + API から取得
        const userId = getUserIdFromCookie();
        if (userId) {
          const response = await fetch('/api/users/me');
          if (response.ok) {
            const data = await response.json() as { user: User };
            currentUser.value = data.user;
          } else {
            // Cookie はあるがユーザーが存在しない → Cookie 無効
            currentUser.value = null;
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize account:', error);
      currentUser.value = null;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }

    return currentUser.value;
  };

  /**
   * アカウント作成
   * @param name - ユーザー名
   * @returns 作成されたユーザー or エラー
   */
  const createAccount = async (name: string): Promise<{ user?: User; error?: string }> => {
    isLoading.value = true;

    try {
      if (isLocalEnvironment()) {
        // ローカル: localStorage に保存
        // 重複チェック（同じ localStorage 内）
        const existingUser = getUserFromStorage();
        if (existingUser && existingUser.name === name) {
          return { error: 'このアカウント名は既に使用されています' };
        }

        const user: User = {
          id: generateUUID(),
          name,
          createdAt: Date.now()
        };

        saveUserToStorage(user);
        currentUser.value = user;

        return { user };
      } else {
        // デプロイ: API 経由で D1 に保存
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });

        if (response.ok) {
          const data = await response.json() as { user: User };
          currentUser.value = data.user;
          return { user: data.user };
        } else if (response.status === 409) {
          return { error: 'このアカウント名は既に使用されています' };
        } else {
          return { error: 'アカウントの作成に失敗しました' };
        }
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      return { error: 'アカウントの作成に失敗しました' };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * ログアウト
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true;

    try {
      if (isLocalEnvironment()) {
        // ローカル: localStorage から削除
        removeUserFromStorage();
      } else {
        // デプロイ: API 経由で Cookie 削除
        await fetch('/api/users/logout', { method: 'POST' });
      }

      currentUser.value = null;
      isInitialized.value = false;
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),

    // Methods
    initialize,
    createAccount,
    logout
  };
};
