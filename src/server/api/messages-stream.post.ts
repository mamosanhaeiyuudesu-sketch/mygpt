/**
 * POST /api/messages-stream - OpenAI にメッセージをストリーミング送信
 */
import { sendMessageToOpenAIStream } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  if (!body?.conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'conversationId is required'
    });
  }

  if (!body?.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'message is required'
    });
  }

  if (!body?.model) {
    throw createError({
      statusCode: 400,
      statusMessage: 'model is required'
    });
  }

  // useContextがfalseの場合はconversationIdを渡さない（文脈なし）
  const useContext = body.useContext !== false;

  // OpenAI にストリーミングメッセージを送信
  const response = await sendMessageToOpenAIStream(
    apiKey,
    useContext ? body.conversationId : undefined,
    body.message,
    body.model,
    body.systemPrompt,
    body.vectorStoreId
  );

  // SSEヘッダーを設定
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  // OpenAIのストリームをそのまま転送
  return response.body;
});
