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

/**
 * Responses API でメッセージを送信
 * POST /v1/responses (conversation パラメータで会話を指定)
 */
export async function sendMessageToOpenAI(
  apiKey: string,
  conversationId: string,
  message: string,
  model: string
): Promise<string> {
  console.log('[OpenAI] Sending message:', { conversationId, model, message: message.substring(0, 50) });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      conversation: conversationId,
      input: message,
      instructions: 'あなたは親切なアシスタントです。回答はMarkdown形式で記述してください。コードブロック、リスト、見出しなどを適切に使用して、読みやすく構造化された回答を提供してください。'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Send message error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as {
    output?: Array<{
      type: string;
      content?: Array<{
        type: string;
        text?: string;
      }>;
    }> | { content?: string };
  };
  console.log('[OpenAI] Raw response:', JSON.stringify(data, null, 2));

  // レスポンス形式に応じてテキストを抽出
  let textContent = 'No response';

  // output_text を探す (配列形式)
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text' && content.text) {
            textContent = content.text;
            break;
          }
        }
      }
    }
  }
  // output.content 形式の場合
  else if (data.output && 'content' in data.output && data.output.content) {
    textContent = data.output.content;
  }

  console.log('[OpenAI] Response received:', textContent.substring(0, 50));
  return textContent;
}
