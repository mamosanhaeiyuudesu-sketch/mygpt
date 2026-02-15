/**
 * GET /api/chats/:id/messages - メッセージ履歴取得
 */
import { getMessages } from '~/server/utils/db/messages';
import { getEncryptionKey, decryptIfKey } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');

  await assertChatOwner(event, id, userId);

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
