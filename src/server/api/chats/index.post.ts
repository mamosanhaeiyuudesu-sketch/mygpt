/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId } from '~/server/utils/db/common';
import { createChat } from '~/server/utils/db/chats';
import { createConversation } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  const chatName = body?.name || 'New Chat';
  const model = body?.model;
  const systemPrompt = body?.systemPrompt;
  const vectorStoreId = body?.vectorStoreId;
  const chatId = generateId('chat');

  // OpenAI Conversationを作成
  const conversationId = await createConversation(apiKey, chatName);

  // DBに保存（userId, model, systemPrompt, vectorStoreId を含む）
  await createChat(event, chatId, userId, conversationId, chatName, model, systemPrompt, vectorStoreId);

  return { chatId, conversationId, userId };
});
