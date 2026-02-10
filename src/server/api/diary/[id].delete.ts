/**
 * DELETE /api/diary/:id - 日記エントリ削除
 */
import { deleteDiaryEntry } from '~/server/utils/db/diary';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const entryId = getRouterParam(event, 'id');
  if (!entryId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Entry ID is required'
    });
  }

  await deleteDiaryEntry(event, entryId);

  return { success: true };
});
