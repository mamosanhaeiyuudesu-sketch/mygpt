/**
 * PATCH /api/diary/:id - 日記エントリのタイトル更新
 */
import { renameDiaryEntry } from '~/server/utils/db/diary';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertDiaryOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const entryId = requireParam(event, 'id', 'エントリIDが必要です');

  const body = await readBody(event);
  const title = body?.title;

  if (typeof title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルが必要です'
    });
  }

  await assertDiaryOwner(event, entryId, userId);

  const encKey = await getEncryptionKey(event);
  const encTitle = await encryptIfKey(title, encKey);
  await renameDiaryEntry(event, entryId, encTitle);

  return { success: true };
});
