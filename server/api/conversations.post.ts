/**
 * POST /api/conversations - OpenAI Conversation を作成
 */
import { createConversation } from '~/server/utils/openai';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const name = body?.name || 'New Chat';

  // OpenAI Conversation を作成
  const conversationId = await createConversation(config.openaiApiKey, name);

  return { conversationId };
});
