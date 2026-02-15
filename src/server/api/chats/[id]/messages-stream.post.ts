/**
 * POST /api/chats/:id/messages-stream - ストリーミングメッセージ送信
 */
import { sendMessageToOpenAIStream } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';
import { useContextToBoolean } from '~/server/utils/db/common';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';
import { getEncryptionKey, decryptNullable } from '~/server/utils/crypto';
import { getPersonaById } from '~/server/utils/db/personas';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  if (!body?.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メッセージが必要です'
    });
  }

  const chat = await assertChatOwner(event, id, userId);

  const model = body.model || chat.model || 'gpt-4o';
  const useContext = body.useContext !== undefined ? body.useContext : useContextToBoolean(chat.use_context);

  // ペルソナIDがある場合は動的にペルソナのデータを取得
  let systemPrompt: string | undefined;
  let vectorStoreId: string | undefined;

  if (chat.persona_id) {
    const persona = await getPersonaById(event, chat.persona_id);
    if (persona) {
      systemPrompt = persona.system_prompt || undefined;
      vectorStoreId = persona.vector_store_id || undefined;
    }
  } else {
    // ペルソナなし: チャット自身のsystem_promptを使用
    const encKey = await getEncryptionKey(event);
    const decryptedSystemPrompt = await decryptNullable(chat.system_prompt, encKey);
    systemPrompt = decryptedSystemPrompt || undefined;
    vectorStoreId = chat.vector_store_id || undefined;
  }

  // OpenAI にストリーミングメッセージを送信
  const response = await sendMessageToOpenAIStream(
    apiKey,
    useContext ? chat.conversation_id : undefined,
    body.message,
    model,
    systemPrompt,
    vectorStoreId
  );

  // SSEヘッダーを設定
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  // OpenAIのストリームをそのまま転送
  return response.body;
});
