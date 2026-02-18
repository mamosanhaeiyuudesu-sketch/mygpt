/**
 * PATCH /api/diary/:id - 日記エントリのタイトル更新 or セクション追加
 */
import { renameDiaryEntry, addDiarySection } from '~/server/utils/db/diary';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertDiaryOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const entryId = requireParam(event, 'id', 'エントリIDが必要です');

  const body = await readBody(event);
  const { title, text, duration } = body || {};

  if (typeof title !== 'string' && typeof text !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルまたはテキストが必要です'
    });
  }

  await assertDiaryOwner(event, entryId, userId);

  const encKey = await getEncryptionKey(event);

  if (typeof title === 'string') {
    const encTitle = await encryptIfKey(title, encKey);
    await renameDiaryEntry(event, entryId, encTitle);
  }

  if (typeof text === 'string') {
    const encText = await encryptIfKey(text, encKey);
    const section = await addDiarySection(event, entryId, encText, duration);
    return {
      success: true,
      section: {
        id: section.id,
        text,
        duration: section.duration,
        completedAt: section.completed_at,
      }
    };
  }

  return { success: true };
});
