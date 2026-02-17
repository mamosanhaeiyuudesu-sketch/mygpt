/**
 * PATCH /api/diary/:id - 日記エントリのタイトル・コンテンツ更新
 */
import { renameDiaryEntry, updateDiaryContent } from '~/server/utils/db/diary';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertDiaryOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const entryId = requireParam(event, 'id', 'エントリIDが必要です');

  const body = await readBody(event);
  const { title, content } = body || {};

  if (typeof title !== 'string' && typeof content !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルまたはコンテンツが必要です'
    });
  }

  await assertDiaryOwner(event, entryId, userId);

  const encKey = await getEncryptionKey(event);

  if (typeof title === 'string') {
    const encTitle = await encryptIfKey(title, encKey);
    await renameDiaryEntry(event, entryId, encTitle);
  }

  if (typeof content === 'string') {
    const encContent = await encryptIfKey(content, encKey);
    await updateDiaryContent(event, entryId, encContent);
  }

  return { success: true };
});
