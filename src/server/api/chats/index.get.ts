/**
 * GET /api/chats - チャット一覧取得
 */
import { getAllChats } from '~/server/utils/db';

const USER_COOKIE_NAME = 'mygpt_user_id';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
    });
  }

  const allChats = await getAllChats(event, userId);

  const chats = allChats.map(chat => ({
    id: chat.id,
    userId: chat.user_id,
    name: chat.name,
    conversationId: chat.conversation_id,
    model: chat.model || 'gpt-4o',
    systemPrompt: chat.system_prompt || null,
    vectorStoreId: chat.vector_store_id || null,
    useContext: chat.use_context !== false,
    lastMessage: chat.last_message || '',
    createdAt: chat.created_at,
    updatedAt: chat.updated_at
  }));

  return { chats };
});
