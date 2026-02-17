/**
 * POST /api/messages-stream - ストリーミング送信（ローカルパス）
 */
import { streamChatMessage } from '~/server/utils/openai';
import { getOpenAIKey, getAnthropicKey } from '~/server/utils/env';
import { buildMessagesWithHistory } from '~/server/utils/history';
import { supportsRAG, detectProvider } from '~/server/utils/providers';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body?.message || !body?.model) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メッセージとモデルが必要です'
    });
  }

  // クライアントから送られた履歴配列を使用
  const history = body.history || [];
  const messages = buildMessagesWithHistory(history, body.message);

  let vectorStoreId = body.vectorStoreId;
  if (vectorStoreId && !supportsRAG(body.model)) {
    vectorStoreId = undefined;
  }

  // APIキーを取得（プロバイダーに応じて）
  const provider = detectProvider(body.model);
  const openaiApiKey = getOpenAIKey(event);
  const anthropicApiKey = provider === 'anthropic' ? getAnthropicKey(event) : undefined;

  const stream = await streamChatMessage(
    { openai: openaiApiKey, anthropic: anthropicApiKey },
    messages,
    body.model,
    body.systemPrompt,
    vectorStoreId
  );

  // SSEヘッダーを設定
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  return stream;
});
