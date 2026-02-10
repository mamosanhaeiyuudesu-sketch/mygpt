/**
 * GET /api/diary - 日記エントリ一覧取得
 */
import { getAllDiaryEntries } from '~/server/utils/db/diary';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const entries = await getAllDiaryEntries(event, userId);

  return {
    entries: entries.map(e => ({
      id: e.id,
      userId: e.user_id,
      content: e.content,
      duration: e.duration,
      createdAt: e.created_at,
    }))
  };
});
