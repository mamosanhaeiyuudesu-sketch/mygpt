/**
 * PATCH /api/users/language - ユーザーの言語設定を更新
 */
import { getUserById, updateUserLanguage } from '~/server/utils/db/users';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);

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
