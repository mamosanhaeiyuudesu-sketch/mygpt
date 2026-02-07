/**
 * POST /api/users/login - 既存ユーザーでログイン
 */
import { getUserByName } from '~/server/utils/db';

const USER_COOKIE_NAME = 'mygpt_user_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2年

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name?.trim();

  if (!name) {
    throw createError({
      statusCode: 400,
      message: 'アカウント名は必須です'
    });
  }

  // ユーザー検索
  const user = await getUserByName(event, name);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'アカウントが見つかりません'
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
