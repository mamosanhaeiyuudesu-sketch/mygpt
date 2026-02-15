/**
 * DELETE /api/diary/:id - 日記エントリ削除
 */
import { deleteDiaryEntry } from '~/server/utils/db/diary';
import { requireAuth, requireParam, assertDiaryOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const entryId = requireParam(event, 'id', 'エントリIDが必要です');

  await assertDiaryOwner(event, entryId, userId);
  await deleteDiaryEntry(event, entryId);

  return { success: true };
});
