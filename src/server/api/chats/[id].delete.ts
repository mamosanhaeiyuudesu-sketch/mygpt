/**
 * DELETE /api/chats/:id - チャット削除
 */
import { deleteChat } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    });
  }

  await deleteChat(event, id);

  return { success: true };
});
