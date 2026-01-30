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

  // OpenAI にメッセージを送信
  const response = await sendMessageToOpenAI(
    apiKey,
    body.conversationId,
    body.message,
    body.model,
    body.systemPrompt
  );

  return { content: response };
});
