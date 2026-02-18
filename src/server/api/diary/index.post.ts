/**
 * POST /api/diary - 日記エントリ作成（最初のセクション付き）
 */
import { createDiaryEntry } from '~/server/utils/db/diary';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);

  const body = await readBody(event);
  const text = body?.text;
  const duration = body?.duration;

  if (!text) {
    throw createError({
      statusCode: 400,
      statusMessage: 'テキストが必要です'
    });
  }

  // タイトルを平文から生成してから暗号化
  const encKey = await getEncryptionKey(event);
  const title = text.substring(0, 30).replace(/\n/g, ' ');
  const encText = await encryptIfKey(text, encKey);
  const encTitle = await encryptIfKey(title, encKey);

  const entry = await createDiaryEntry(event, userId, encText, encTitle, duration);

  return {
    id: entry.id,
    userId: entry.user_id,
    title,
    sections: [{
      id: entry.sections[0].id,
      text,
      duration: entry.sections[0].duration,
      completedAt: entry.sections[0].completed_at,
    }],
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
});
