/**
 * GET /api/chats/:id/messages - メッセージ履歴取得
 */
import { getMessages } from '~/server/utils/db/messages';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'チャットIDが必要です'
    });
  }

  const allMessages = await getMessages(event, id);

  const messages = allMessages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.created_at
  }));

  return { messages };
});
