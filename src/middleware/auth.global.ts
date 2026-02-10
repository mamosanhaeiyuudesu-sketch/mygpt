/**
 * グローバル認証ミドルウェア
 * パスワードが設定されている場合、未認証ユーザーをパスワードページにリダイレクト
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // パスワードページ自体はスキップ
  if (to.path === '/password') return;

  const { data } = await useFetch('/api/auth/check', { key: 'auth-check' });

  if (data.value && !data.value.authenticated) {
    return navigateTo('/password');
  }
});
