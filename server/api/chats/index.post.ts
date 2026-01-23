/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId, createChat } from '~/server/utils/db';
import { createConversation } from '~/server/utils/openai';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody(event);

  const chatName = body?.name || 'New Chat';
  const chatId = generateId('chat');

  // OpenAI Conversationを作成
  const conversationId = await createConversation(config.openaiApiKey, chatName);

  // DBに保存
  createChat(chatId, conversationId, chatName);

  return { chatId, conversationId };
});
