/**
 * PATCH /api/chats/:id - チャット名変更
 */
import { updateChatName } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    });
  }

  if (!body?.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name is required'
    });
  }

  updateChatName(id, body.name);

  return { success: true };
});
