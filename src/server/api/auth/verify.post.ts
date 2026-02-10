/**
 * POST /api/auth/verify - パスワード検証
 */
import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from '~/server/utils/constants';
import { getAppPassword } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const appPassword = getAppPassword(event);

  // パスワード未設定の場合は常に成功
  if (!appPassword) {
    return { success: true };
  }

  const body = await readBody(event);
  const password = body?.password;

  if (typeof password !== 'string' || password !== appPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid password',
    });
  }

  // 認証クッキーを設定
  setCookie(event, AUTH_COOKIE_NAME, 'authenticated', {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  return { success: true };
});
