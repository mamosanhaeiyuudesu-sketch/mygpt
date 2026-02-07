/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId, createChat } from '~/server/utils/db';
import { createConversation } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

const USER_COOKIE_NAME = 'mygpt_user_id';

export default defineEventHandler(async (event) => {
  const userId = getCookie(event, USER_COOKIE_NAME);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'ログインが必要です'
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
