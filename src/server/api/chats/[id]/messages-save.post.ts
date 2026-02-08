/**
 * POST /api/chats/:id/messages-save - メッセージをD1に保存
 */
import { getChat, generateId, createMessage, updateChatTimestamp } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'チャットIDが必要です'
    });
  }

  if (!body?.userMessage || !body?.assistantMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ユーザーメッセージとアシスタントメッセージが必要です'
    });
  }

  // チャット存在確認
  const chat = await getChat(event, id);
  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'チャットが見つかりません'
    });
  }

  const now = Date.now();

  // ユーザーメッセージを保存
  const userMessageId = generateId('msg');
  await createMessage(event, userMessageId, id, 'user', body.userMessage, now);

  // アシスタントメッセージを保存
  const assistantMessageId = generateId('msg');
  await createMessage(event, assistantMessageId, id, 'assistant', body.assistantMessage, now + 1);

  // チャットのupdated_atを更新
  await updateChatTimestamp(event, id, now + 1);

  return { success: true };
});
