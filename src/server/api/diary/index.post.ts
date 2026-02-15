/**
 * POST /api/diary - 日記エントリ保存
 */
import { createDiaryEntry } from '~/server/utils/db/diary';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);

  const body = await readBody(event);
  const content = body?.content;
  const duration = body?.duration;

  if (!content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'コンテンツが必要です'
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
