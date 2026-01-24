/**
 * POST /api/conversations - OpenAI Conversation を作成
 */
import { createConversation } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const name = body?.name || 'New Chat';

  // OpenAI API キーを取得
  const apiKey = getOpenAIKey(event);

  // OpenAI Conversation を作成
  const conversationId = await createConversation(apiKey, name);

  return { conversationId };
});
