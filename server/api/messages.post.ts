/**
 * POST /api/messages - OpenAI にメッセージを送信
 */
import { sendMessageToOpenAI } from '~/server/utils/openai';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

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
    config.openaiApiKey,
    body.conversationId,
    body.message,
    body.model
  );

  return { content: response };
});
