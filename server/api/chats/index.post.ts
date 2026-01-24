/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId, createChat } from '~/server/utils/db';
import { createConversation } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  const chatName = body?.name || 'New Chat';
  const chatId = generateId('chat');

  // OpenAI Conversationを作成
  const conversationId = await createConversation(apiKey, chatName);

  // DBに保存
  await createChat(event, chatId, conversationId, chatName);

  return { chatId, conversationId };
});
