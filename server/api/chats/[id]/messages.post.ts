/**
 * POST /api/chats/:id/messages - メッセージ送信
 */
import { getChat, generateId, createMessage, updateChatTimestamp } from '~/server/utils/db';
import { sendMessageToOpenAI } from '~/server/utils/openai';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    });
  }

  if (!body?.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    });
  }

  // チャットからconversation_idを取得
  const chat = getChat(id);
  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    });
  }

  const now = Date.now();

  // OpenAI APIにメッセージ送信
  const assistantResponse = await sendMessageToOpenAI(
    config.openaiApiKey,
    chat.conversation_id,
    body.message
  );

  // ユーザーメッセージを保存
  const userMessageId = generateId('msg');
  createMessage(userMessageId, id, 'user', body.message, now);

  // アシスタントメッセージを保存
  const assistantMessageId = generateId('msg');
  createMessage(assistantMessageId, id, 'assistant', assistantResponse, now + 1);

  // チャットのupdated_atを更新
  updateChatTimestamp(id, now + 1);

  return {
    id: assistantMessageId,
    role: 'assistant',
    content: assistantResponse,
    createdAt: now + 1
  };
});
