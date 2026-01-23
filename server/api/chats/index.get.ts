/**
 * GET /api/chats - チャット一覧取得
 */
import { getAllChats } from '~/server/utils/db';

export default defineEventHandler(() => {
  const chats = getAllChats().map(chat => ({
    id: chat.id,
    name: chat.name,
    lastMessage: chat.last_message || '',
    updatedAt: chat.updated_at
  }));

  return { chats };
});
