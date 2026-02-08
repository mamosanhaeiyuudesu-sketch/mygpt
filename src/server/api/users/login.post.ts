/**
 * POST /api/users/login - 既存ユーザーでログイン
 */
import { getUserByName } from '~/server/utils/db';
import { USER_COOKIE_NAME, COOKIE_MAX_AGE } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name?.trim();

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'アカウント名は必須です'
    });
  }

  // ユーザー検索
  const user = await getUserByName(event, name);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'アカウントが見つかりません'
    });
  }

  // Cookie にユーザーIDを保存
  setCookie(event, USER_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      createdAt: user.created_at
    }
  };
});
