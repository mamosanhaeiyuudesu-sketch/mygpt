/**
 * GET /api/users/me - 現在のユーザーを取得
 */
import { getUserById } from '~/server/utils/db/users';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const user = await getUserById(event, userId);

  if (!user) {
    // Cookie はあるがユーザーが見つからない → Cookie を削除
    deleteCookie(event, USER_COOKIE_NAME);
    throw createError({
      statusCode: 404,
      statusMessage: 'ユーザーが見つかりません'
    });
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      createdAt: user.created_at
    }
  };
});
