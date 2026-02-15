/**
 * POST /api/chats/:id/messages-stream - ストリーミングメッセージ送信
 */
import { sendMessageToOpenAIStream } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';
import { useContextToBoolean } from '~/server/utils/db/common';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

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
  const systemPrompt = chat.system_prompt || undefined;
  const vectorStoreId = chat.vector_store_id || undefined;
  const useContext = body.useContext !== undefined ? body.useContext : useContextToBoolean(chat.use_context);

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
