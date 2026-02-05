/**
 * OpenAI Conversations API ヘルパー関数
 * https://platform.openai.com/docs/api-reference/conversations
 */

/**
 * Conversation を作成
 * POST /v1/conversations
 */
export async function createConversation(apiKey: string, name: string): Promise<string> {
  console.log('[OpenAI] Creating conversation:', { name });

  const response = await fetch('https://api.openai.com/v1/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metadata: { name }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Create conversation error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as { id: string };
  console.log('[OpenAI] Conversation created:', data.id);
  return data.id;
}

const DEFAULT_SYSTEM_PROMPT = 'あなたは親切なアシスタントです。回答はMarkdown形式で記述してください。コードブロック、リスト、見出しなどを適切に使用して、読みやすく構造化された回答を提供してください。見出し（##や###）は25文字以内で簡潔に記述してください。';

const RAG_INSTRUCTION_SUFFIX = '\n\n重要: ユーザーの質問に答える際は、必ず提供されたファイル検索ツール(file_search)を使用して関連情報を検索し、その結果に基づいて回答してください。検索結果がない場合や関連情報が見つからない場合は、その旨を明記してください。';

/**
 * Responses API でメッセージをストリーミング送信
 * @param conversationId - 会話ID（undefinedの場合は文脈なしで単発送信）
 * @returns ReadableStream<Uint8Array>
 */
export async function sendMessageToOpenAIStream(
  apiKey: string,
  conversationId: string | undefined,
  message: string,
  model: string,
  systemPrompt?: string,
  vectorStoreId?: string
): Promise<Response> {
  console.log('[OpenAI] Sending streaming message:', { conversationId: conversationId || '(no context)', model, vectorStoreId });

  // Vector Storeが指定されている場合、RAG用の指示を追加
  let instructions = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  if (vectorStoreId) {
    instructions += RAG_INSTRUCTION_SUFFIX;
  }

  // リクエストボディを構築
  const requestBody: Record<string, unknown> = {
    model,
    input: message,
    instructions,
    stream: true
  };

  // conversationIdがある場合のみ文脈を保持
  if (conversationId) {
    requestBody.conversation = conversationId;
  }

  // Vector Storeが指定されている場合、file_searchツールを追加
  if (vectorStoreId) {
    requestBody.tools = [{
      type: 'file_search',
      vector_store_ids: [vectorStoreId]
    }];
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Send streaming message error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  return response;
}
