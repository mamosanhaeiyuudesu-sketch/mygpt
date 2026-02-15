/**
 * POST /api/chats/:id/messages-save - メッセージをD1に保存
 */
import { generateId } from '~/server/utils/db/common';
import { updateChatTimestamp } from '~/server/utils/db/chats';
import { createMessage } from '~/server/utils/db/messages';
import { getEncryptionKey, encryptIfKey } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');
  const body = await readBody(event);

  if (!body?.userMessage || !body?.assistantMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーメッセージとアシスタントメッセージが必要です'
    });
  }

  await assertChatOwner(event, id, userId);

  const now = Date.now();
  const encKey = await getEncryptionKey(event);

  // ユーザーメッセージを暗号化して保存
  const userMessageId = generateId('msg');
  const encUserMsg = await encryptIfKey(body.userMessage, encKey);
  await createMessage(event, userMessageId, id, 'user', encUserMsg, now);

  // アシスタントメッセージを暗号化して保存
  const assistantMessageId = generateId('msg');
  const encAssistantMsg = await encryptIfKey(body.assistantMessage, encKey);
  await createMessage(event, assistantMessageId, id, 'assistant', encAssistantMsg, now + 1);

  // チャットのupdated_atを更新
  await updateChatTimestamp(event, id, now + 1);

  return { success: true };
});
