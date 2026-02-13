/**
 * GET /api/chats - チャット一覧取得
 */
import { getAllChats } from '~/server/utils/db/chats';
import { USER_COOKIE_NAME } from '~/server/utils/constants';
import { getEncryptionKey, decryptIfKey, decryptNullable } from '~/server/utils/crypto';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const allChats = await getAllChats(event, userId);
  const encKey = await getEncryptionKey(event);

  const chats = await Promise.all(allChats.map(async chat => ({
    id: chat.id,
    userId: chat.user_id,
    name: await decryptIfKey(chat.name, encKey),
    conversationId: chat.conversation_id,
    model: chat.model || 'gpt-4o',
    systemPrompt: await decryptNullable(chat.system_prompt, encKey) as string | null || null,
    vectorStoreId: chat.vector_store_id || null,
    lastMessage: chat.last_message ? await decryptIfKey(chat.last_message, encKey) : '',
    createdAt: chat.created_at,
    updatedAt: chat.updated_at
  })));

  return { chats };
});
