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

  // OpenAI にメッセージを送信
  const response = await sendMessageToOpenAI(
    config.openaiApiKey,
    body.conversationId,
    body.message
  );

  return { content: response };
});
