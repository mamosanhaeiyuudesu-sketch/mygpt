import type { Language } from '~/types';

/**
 * ページ共通の認証ハンドラー（ログアウト・言語変更）
 */
export const usePageAuth = () => {
  const { t } = useI18n();
  const { currentUser, logout, updateLanguage } = useAccount();

  const handleLogout = async () => {
    if (!confirm(t('logout.confirm'))) return;
    await logout();
    window.location.reload();
  };

  const handleLanguageChange = async (language: Language) => {
    await updateLanguage(language);
  };

  return { currentUser, handleLogout, handleLanguageChange };
};
