/**
 * アカウント管理 Composable
 * ローカル環境: localStorage を使用
 * デプロイ環境: API (D1 + Cookie) を使用
 */
import type { User, Language } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';
import {
  getUserFromStorage,
  saveAccountToStorage,
  saveUserToStorage,
  clearCurrentUserFromStorage,
  findAccountByName,
  generateUUID
} from '~/utils/storage';

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
