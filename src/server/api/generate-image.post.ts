/**
 * POST /api/generate-image - ペルソナ名とふるまいからDALL-Eで画像を生成
 */
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const apiKey = getOpenAIKey(event);

  const name = body?.name as string;
  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ペルソナ名が必要です',
    });
  }

  const systemPrompt = (body?.systemPrompt as string) || '';

  const prompt = `Create a simple, clean avatar icon for a chat AI persona named "${name}".${systemPrompt ? ` This persona's behavior: ${systemPrompt}.` : ''} Style: minimal, friendly, suitable as a small profile picture. No text in the image.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Generate image error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '画像生成に失敗しました',
    });
  }

  const data = await response.json() as {
    data: Array<{ b64_json: string }>;
  };

  const b64 = data.data[0]?.b64_json;
  if (!b64) {
    throw createError({
      statusCode: 500,
      statusMessage: '画像データが取得できませんでした',
    });
  }

  // Base64 Data URLとして返す（processImageでリサイズされるのと同じ形式）
  const imageUrl = `data:image/png;base64,${b64}`;

  return { imageUrl };
});
