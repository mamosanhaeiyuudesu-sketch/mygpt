/**
 * DELETE /api/chats/:id - チャット削除
 */
import { deleteChat } from '~/server/utils/db/chats';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');

  await assertChatOwner(event, id, userId);
  await deleteChat(event, id);

  return { success: true };
});
