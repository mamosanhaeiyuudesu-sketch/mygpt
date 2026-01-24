/**
 * GET /api/chats/:id/messages - メッセージ履歴取得
 */
import { getMessages } from '~/server/utils/db';

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    });
  }

  const messages = getMessages(id).map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.created_at
  }));

  return { messages };
});
