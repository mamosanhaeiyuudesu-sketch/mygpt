/**
 * POST /api/messages - OpenAI にメッセージを送信
 */
import { sendMessageToOpenAI } from '~/server/utils/openai';
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

  // OpenAI にメッセージを送信
  const response = await sendMessageToOpenAI(
    apiKey,
    useContext ? body.conversationId : undefined,
    body.message,
    body.model,
    body.systemPrompt,
    body.vectorStoreId
  );

  return { content: response };
});
