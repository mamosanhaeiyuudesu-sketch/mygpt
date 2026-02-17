/**
 * POST /api/chats - 新しいチャット作成
 */
import { generateId } from '~/server/utils/db/common';
import { createChat } from '~/server/utils/db/chats';
import { getEncryptionKey, encryptIfKey, encryptNullable } from '~/server/utils/crypto';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const body = await readBody(event);

  const chatName = body?.name || 'New Chat';
  const model = body?.model;
  const useContext = body?.useContext;
  const personaId = body?.personaId;
  const chatId = generateId('chat');

  // personaId指定時はsystemPrompt/vectorStoreIdをDBに保存しない（動的参照）
  const systemPrompt = personaId ? undefined : body?.systemPrompt;
  const vectorStoreId = personaId ? undefined : body?.vectorStoreId;

  try {
    const encKey = await getEncryptionKey(event);
    const encName = await encryptIfKey(chatName, encKey);
    const encSystemPrompt = await encryptNullable(systemPrompt, encKey) as string | undefined;
    await createChat(event, chatId, userId, encName, model, encSystemPrompt, vectorStoreId, useContext, personaId);
  } catch (e) {
    console.error('[POST /api/chats] DB save failed:', e);
    throw createError({ statusCode: 500, statusMessage: `DB save failed: ${(e as Error).message}` });
  }

  return { chatId, userId };
});
