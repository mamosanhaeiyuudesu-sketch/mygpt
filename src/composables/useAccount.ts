/**
 * アカウント管理 Composable
 * ローカル環境: localStorage を使用
 * デプロイ環境: API (D1 + Cookie) を使用
 */
import type { User, Language } from '~/types';
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
 * localStorage から保存されたアカウント一覧を取得
 */
function getSavedAccountsFromStorage(): Record<string, User> {
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
function saveAccountToStorage(user: User): void {
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
 * localStorage から現在のログインユーザーをクリア（アカウント情報は残す）
 */
function clearCurrentUserFromStorage(): void {
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
function findAccountByName(name: string): User | null {
  const savedAccounts = getSavedAccountsFromStorage();
  return savedAccounts[name] || null;
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
        // デプロイ: API から取得（httpOnly Cookie はサーバーが自動的に読み取る）
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const data = await response.json() as { user: User };
          currentUser.value = data.user;
        } else {
          currentUser.value = null;
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
        // 重複チェック（savedAccounts内）
        const existingAccount = findAccountByName(name);
        if (existingAccount) {
          return { error: 'すでに作成されたアカウントです' };
        }

        const user: User = {
          id: generateUUID(),
          name,
          createdAt: Date.now()
        };

        // savedAccountsに保存
        saveAccountToStorage(user);
        // 現在のユーザーとして設定
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
   * ログイン
   * @param name - ユーザー名
   * @returns ログインしたユーザー or エラー
   */
  const login = async (name: string): Promise<{ user?: User; error?: string }> => {
    isLoading.value = true;

    try {
      if (isLocalEnvironment()) {
        // ローカル: savedAccounts から検索
        const existingAccount = findAccountByName(name);
        if (!existingAccount) {
          return { error: 'そのアカウントはありません' };
        }

        // 現在のユーザーとして設定
        saveUserToStorage(existingAccount);
        currentUser.value = existingAccount;

        return { user: existingAccount };
      } else {
        // デプロイ: API 経由でログイン
        const response = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });

        if (response.ok) {
          const data = await response.json() as { user: User };
          currentUser.value = data.user;
          return { user: data.user };
        } else if (response.status === 404) {
          return { error: 'そのアカウントはありません' };
        } else {
          return { error: 'ログインに失敗しました' };
        }
      }
    } catch (error) {
      console.error('Failed to login:', error);
      return { error: 'ログインに失敗しました' };
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 言語設定を更新
   * @param language - 言語コード
   */
  const updateLanguage = async (language: Language): Promise<void> => {
    if (!currentUser.value) return;

    try {
      if (isLocalEnvironment()) {
        // ローカル: localStorage を更新
        const updatedUser = { ...currentUser.value, language };
        saveUserToStorage(updatedUser);
        saveAccountToStorage(updatedUser);
        currentUser.value = updatedUser;
      } else {
        // デプロイ: API 経由で更新
        const response = await fetch('/api/users/language', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language })
        });

        if (response.ok) {
          const data = await response.json() as { user: User };
          currentUser.value = data.user;
        }
      }
    } catch (error) {
      console.error('Failed to update language:', error);
    }
  };

  /**
   * ログアウト
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true;

    try {
      if (isLocalEnvironment()) {
        // ローカル: 現在のログイン状態をクリア（アカウント情報は残す）
        clearCurrentUserFromStorage();
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
    login,
    updateLanguage,
    logout
  };
};
