/**
 * POST /api/diary - 日記エントリ保存
 */
import { createDiaryEntry } from '~/server/utils/db/diary';
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

  const body = await readBody(event);
  const content = body?.content;
  const duration = body?.duration;

  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'content is required'
    });
  }

  // タイトルを平文から生成してから暗号化
  const encKey = await getEncryptionKey(event);
  const title = content.substring(0, 30).replace(/\n/g, ' ');
  const encContent = await encryptIfKey(content, encKey);
  const encTitle = await encryptIfKey(title, encKey);

  const entry = await createDiaryEntry(event, userId, encContent, duration, encTitle);

  return {
    id: entry.id,
    userId: entry.user_id,
    title,
    content,
    duration: entry.duration,
    createdAt: entry.created_at,
  };
});
