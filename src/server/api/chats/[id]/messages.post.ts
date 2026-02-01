/**
 * POST /api/chats/:id/messages - メッセージ送信
 */
import { getChat, generateId, createMessage, updateChatTimestamp } from '~/server/utils/db';
import { sendMessageToOpenAI } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

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
  const chat = await getChat(event, id);
  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    });
  }

  const now = Date.now();

  // OpenAI APIにメッセージ送信
  const model = body.model || 'gpt-4o';
  const systemPrompt = chat.system_prompt || undefined;
  const vectorStoreId = chat.vector_store_id || undefined;
  const assistantResponse = await sendMessageToOpenAI(
    apiKey,
    chat.conversation_id,
    body.message,
    model,
    systemPrompt,
    vectorStoreId
  );

  // ユーザーメッセージを保存
  const userMessageId = generateId('msg');
  await createMessage(event, userMessageId, id, 'user', body.message, now);

  // アシスタントメッセージを保存
  const assistantMessageId = generateId('msg');
  await createMessage(event, assistantMessageId, id, 'assistant', assistantResponse, now + 1);

  // チャットのupdated_atを更新
  await updateChatTimestamp(event, id, now + 1);

  return {
    id: assistantMessageId,
    role: 'assistant',
    content: assistantResponse,
    createdAt: now + 1
  };
});
