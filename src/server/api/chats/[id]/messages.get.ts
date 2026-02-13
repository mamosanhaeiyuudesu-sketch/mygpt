/**
 * GET /api/chats/:id/messages - メッセージ履歴取得
 */
import { getMessages } from '~/server/utils/db/messages';
import { getEncryptionKey, decryptIfKey } from '~/server/utils/crypto';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'チャットIDが必要です'
    });
  }

  const allMessages = await getMessages(event, id);
  const encKey = await getEncryptionKey(event);

  const messages = await Promise.all(allMessages.map(async msg => ({
    id: msg.id,
    role: msg.role,
    content: await decryptIfKey(msg.content, encKey),
    createdAt: msg.created_at
  })));

  return { messages };
});
