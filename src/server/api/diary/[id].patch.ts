/**
 * PATCH /api/diary/:id - 日記エントリのタイトル更新
 */
import { renameDiaryEntry } from '~/server/utils/db/diary';
import { USER_COOKIE_NAME } from '~/server/utils/constants';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';

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

  const encKey = await getEncryptionKey(event);
  const encTitle = await encryptIfKey(title, encKey);
  await renameDiaryEntry(event, entryId, encTitle);

  return { success: true };
});
