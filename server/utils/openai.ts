/**
 * OpenAI API ヘルパー関数
 * 標準の Chat Completions API を使用
 */

/**
 * Conversation ID を生成（ローカル用のダミー）
 */
export async function createConversation(apiKey: string, name: string): Promise<string> {
  // ローカルでは単にIDを生成するだけ
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * OpenAI Chat Completions API: メッセージ送信
 */
export async function sendMessageToOpenAI(
  apiKey: string,
  conversationId: string,
  message: string
): Promise<string> {
  console.log('[OpenAI] Sending message:', { conversationId, message: message.substring(0, 50) });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] API error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const content = data.choices[0]?.message?.content || 'No response';
  console.log('[OpenAI] Response received:', content.substring(0, 50));

  return content;
}
