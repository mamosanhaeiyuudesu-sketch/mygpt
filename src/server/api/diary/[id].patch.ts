/**
 * PATCH /api/diary/:id - 日記エントリのタイトル更新
 */
import { renameDiaryEntry } from '~/server/utils/db/diary';
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

  const body = await readBody(event);
  const title = body?.title;

  if (typeof title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'title is required'
    });
  }

  await renameDiaryEntry(event, entryId, title);

  return { success: true };
});
