/**
 * DELETE /api/chats/:id - チャット削除
 */
import { deleteChat } from '~/server/utils/db/chats';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'チャットIDが必要です'
    });
  }

  await deleteChat(event, id);

  return { success: true };
});
