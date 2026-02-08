/**
 * PATCH /api/users/language - ユーザーの言語設定を更新
 */
import { getUserById, updateUserLanguage } from '~/server/utils/db';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const body = await readBody(event);
  const language = body?.language;

  if (!language || !['ja', 'ko', 'en'].includes(language)) {
    throw createError({
      statusCode: 400,
      statusMessage: '無効な言語コードです'
    });
  }

  // ユーザー存在確認
  const user = await getUserById(event, userId);
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ユーザーが見つかりません'
    });
  }

  // 言語を更新
  await updateUserLanguage(event, userId, language);

  return {
    user: {
      id: user.id,
      name: user.name,
      language,
      createdAt: user.created_at
    }
  };
});
