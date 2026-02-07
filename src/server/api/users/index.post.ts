/**
 * POST /api/users - 新しいユーザー作成
 */
import { generateId, createUser, getUserByName } from '~/server/utils/db';

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

  // 重複チェック
  const existingUser = await getUserByName(event, name);
  if (existingUser) {
    throw createError({
      statusCode: 409,
      message: 'このアカウント名は既に使用されています'
    });
  }

  // ユーザー作成
  const userId = generateId('user');
  const user = await createUser(event, userId, name);

  // Cookie にユーザーIDを保存
  setCookie(event, USER_COOKIE_NAME, userId, {
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
