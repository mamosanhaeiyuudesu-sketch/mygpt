/**
 * POST /api/generate-title - チャットメッセージからタイトルを生成
 */
import { getOpenAIKey } from '~/server/utils/env';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);
  const config = useRuntimeConfig(event);
  const defaultModel = config.defaultModel as string || 'gpt-4o-mini';

  if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メッセージが必要です'
    });
  }

  const messages = body.messages as Message[];
  const excludeTitles = (body.excludeTitles as string[]) || [];

  // メッセージの要約を作成（最初の数件のみ使用）
  const summary = messages
    .slice(0, 6)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 200)}`)
    .join('\n');

  // 除外タイトルの指示を追加
  const excludeInstruction = excludeTitles.length > 0
    ? `\n\n以下のタイトルは既に提案済みなので、別のタイトルを生成してください: ${excludeTitles.join('、')}`
    : '';

  // Chat Completions API でタイトルを生成
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: [
        {
          role: 'system',
          content: 'あなたはチャットのタイトルを生成するアシスタントです。与えられた会話内容から、15文字以内の簡潔な日本語タイトルを生成してください。タイトルのみを出力し、余計な説明は不要です。'
        },
        {
          role: 'user',
          content: `以下の会話内容から日本語15文字以内のタイトルを生成してください:\n\n${summary}${excludeInstruction}`
        }
      ],
      max_tokens: 150,
      temperature: 0.9
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Generate title error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'タイトル生成に失敗しました'
    });
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const title = data.choices[0]?.message?.content?.trim() || 'New Chat';

  return { title };
});
