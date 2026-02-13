/**
 * GET /api/diary - 日記エントリ一覧取得
 */
import { getAllDiaryEntries } from '~/server/utils/db/diary';
import { USER_COOKIE_NAME } from '~/server/utils/constants';
import { getEncryptionKey, decryptIfKey } from '~/server/utils/crypto';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const entries = await getAllDiaryEntries(event, userId);
  const encKey = await getEncryptionKey(event);

  return {
    entries: await Promise.all(entries.map(async e => ({
      id: e.id,
      userId: e.user_id,
      title: await decryptIfKey(e.title, encKey),
      content: await decryptIfKey(e.content, encKey),
      duration: e.duration,
      createdAt: e.created_at,
    })))
  };
});
