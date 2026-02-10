/**
 * GET /api/auth/check - 認証状態確認
 */
import { AUTH_COOKIE_NAME } from '~/server/utils/constants';
import { getAppPassword } from '~/server/utils/env';

export default defineEventHandler((event) => {
  const appPassword = getAppPassword(event);

  // パスワード未設定の場合は常に認証済み
  if (!appPassword) {
    return { authenticated: true };
  }

  const authCookie = getCookie(event, AUTH_COOKIE_NAME);
  return { authenticated: authCookie === 'authenticated' };
});
