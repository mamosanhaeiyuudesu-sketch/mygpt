/**
 * POST /api/chats/:id/messages-stream - ストリーミングメッセージ送信（本番パス）
 */
import { streamChatMessage } from '~/server/utils/openai';
import { getOpenAIKey, getAnthropicKey, getMaxHistoryRounds } from '~/server/utils/env';
import { useContextToBoolean } from '~/server/utils/db/common';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';
import { getEncryptionKey, decryptNullable } from '~/server/utils/crypto';
import { getPersonaById } from '~/server/utils/db/personas';
import { getMessages } from '~/server/utils/db/messages';
import { getContextMessages, buildMessagesWithHistory } from '~/server/utils/history';
import { supportsRAG, detectProvider } from '~/server/utils/providers';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');
  const body = await readBody(event);

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
    const encKey = await getEncryptionKey(event);
    const decryptedSystemPrompt = await decryptNullable(chat.system_prompt, encKey);
    systemPrompt = decryptedSystemPrompt || undefined;
    vectorStoreId = chat.vector_store_id || undefined;
  }

  // RAG非対応モデルではvectorStoreIdを無視
  if (vectorStoreId && !supportsRAG(model)) {
    vectorStoreId = undefined;
  }

  // メッセージ履歴を構築
  let messages: { role: 'user' | 'assistant'; content: string }[];

  if (useContext) {
    const maxRounds = getMaxHistoryRounds(event);
    const dbMessages = await getMessages(event, id);

    // メッセージを復号
    const encKey = await getEncryptionKey(event);
    const decryptedMessages = await Promise.all(
      dbMessages.map(async (msg) => ({
        ...msg,
        content: (await decryptNullable(msg.content, encKey)) || ''
      }))
    );

    const contextMessages = getContextMessages(decryptedMessages, maxRounds);
    messages = buildMessagesWithHistory(contextMessages, body.message);
  } else {
    messages = [{ role: 'user', content: body.message }];
  }

  // APIキーを取得（プロバイダーに応じて）
  const provider = detectProvider(model);
  const openaiApiKey = getOpenAIKey(event);
  const anthropicApiKey = provider === 'anthropic' ? getAnthropicKey(event) : undefined;

  // ストリーミング
  const stream = await streamChatMessage(
    { openai: openaiApiKey, anthropic: anthropicApiKey },
    messages,
    model,
    systemPrompt,
    vectorStoreId
  );

  // SSEヘッダーを設定
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  return stream;
});
