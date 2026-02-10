/**
 * POST /api/diary - 日記エントリ保存
 */
import { createDiaryEntry } from '~/server/utils/db/diary';
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
  const content = body?.content;
  const duration = body?.duration;

  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'content is required'
    });
  }

  const entry = await createDiaryEntry(event, userId, content, duration);

  return {
    id: entry.id,
    userId: entry.user_id,
    content: entry.content,
    duration: entry.duration,
    createdAt: entry.created_at,
  };
});
