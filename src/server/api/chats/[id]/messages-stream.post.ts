/**
 * POST /api/chats/:id/messages-stream - ストリーミングメッセージ送信
 */
import { getChat } from '~/server/utils/db';
import { sendMessageToOpenAIStream } from '~/server/utils/openai';
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

  const model = body.model || chat.model || 'gpt-4o';
  const systemPrompt = chat.system_prompt || undefined;
  const vectorStoreId = chat.vector_store_id || undefined;
  const useContext = body.useContext !== false;

  // OpenAI にストリーミングメッセージを送信
  const response = await sendMessageToOpenAIStream(
    apiKey,
    useContext ? chat.conversation_id : undefined,
    body.message,
    model,
    systemPrompt,
    vectorStoreId
  );

  // SSEヘッダーを設定
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  // OpenAIのストリームをそのまま転送
  return response.body;
});
