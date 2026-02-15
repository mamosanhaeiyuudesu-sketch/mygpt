/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId } from '~/server/utils/db/common';
import { createChat } from '~/server/utils/db/chats';
import { createConversation } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';
import { getEncryptionKey, encryptIfKey, encryptNullable } from '~/server/utils/crypto';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);

  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  const chatName = body?.name || 'New Chat';
  const model = body?.model;
  const systemPrompt = body?.systemPrompt;
  const vectorStoreId = body?.vectorStoreId;
  const useContext = body?.useContext;
  const presetName = body?.presetName;
  const chatId = generateId('chat');

  // OpenAI Conversationを作成
  const conversationId = await createConversation(apiKey, chatName);

  // 暗号化してDBに保存
  const encKey = await getEncryptionKey(event);
  const encName = await encryptIfKey(chatName, encKey);
  const encSystemPrompt = await encryptNullable(systemPrompt, encKey) as string | undefined;
  await createChat(event, chatId, userId, conversationId, encName, model, encSystemPrompt, vectorStoreId, useContext, presetName);

  return { chatId, conversationId, userId };
});
