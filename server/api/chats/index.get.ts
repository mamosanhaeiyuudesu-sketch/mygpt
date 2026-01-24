/**
 * GET /api/chats - チャット一覧取得
 */
import { getAllChats } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const allChats = await getAllChats(event);

  const chats = allChats.map(chat => ({
    id: chat.id,
    name: chat.name,
    lastMessage: chat.last_message || '',
    updatedAt: chat.updated_at
  }));

  return { chats };
});
