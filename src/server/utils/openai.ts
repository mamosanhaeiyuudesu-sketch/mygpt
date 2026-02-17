/**
 * AI Provider APIs (OpenAI Chat Completions + Anthropic Messages)
 * SSEストリームをサーバー側で統一フォーマットに正規化
 */
import type { HistoryMessage } from './history';
import { detectProvider } from './providers';

const DEFAULT_SYSTEM_PROMPT = `あなたは親切なアシスタントです。回答はMarkdown形式で記述してください。

## 出力の構造化ルール
- 回答が長くなる場合は、内容をいくつかのセクションに分けて構造化してください
- 各セクションには見出し（##）を付けて区分けしてください
- 必要に応じてセクション内でさらに小見出し（###）を使って細分化してください
- 見出しには番号を付けないでください（例: 「## 概要」は良い、「## 1. 概要」は避ける）
- 見出しは25文字以内で簡潔に記述してください
- コードブロック、リスト、表などを適切に使用して読みやすくしてください
- 短い回答の場合は無理にセクション分けせず、簡潔に回答してください`;

const RAG_INSTRUCTION_SUFFIX = '\n\n重要: ユーザーの質問に答える際は、必ず提供されたファイル検索ツール(file_search)を使用して関連情報を検索し、その結果に基づいて回答してください。検索結果がない場合や関連情報が見つからない場合は、その旨を明記してください。';

/**
 * 音声ファイルを文字起こし（Whisper API）
 */
export async function transcribeAudio(apiKey: string, audioBuffer: Uint8Array, filename: string): Promise<string> {
  console.log('[OpenAI] Transcribing audio:', { filename });

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)]);
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Transcription error:', error);
    throw new Error(`OpenAI Transcription API error: ${error}`);
  }

  const data = await response.json() as { text: string };
  console.log('[OpenAI] Transcription complete:', data.text.substring(0, 100));
  return data.text;
}

/**
 * OpenAI Chat Completions API でストリーミング
 */
async function streamOpenAI(
  apiKey: string,
  messages: HistoryMessage[],
  model: string,
  systemPrompt: string,
  vectorStoreId?: string
): Promise<Response> {
  console.log('[OpenAI] Streaming with Chat Completions:', { model, messageCount: messages.length, vectorStoreId });

  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    stream: true
  };

  // RAG: file_search tool
  if (vectorStoreId) {
    requestBody.tools = [{
      type: 'file_search',
      vector_store_ids: [vectorStoreId]
    }];
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[OpenAI] Streaming error:', error);
    throw new Error(`OpenAI API error: ${error}`);
  }

  return response;
}

/**
 * Anthropic Messages API でストリーミング
 */
async function streamAnthropic(
  apiKey: string,
  messages: HistoryMessage[],
  model: string,
  systemPrompt: string
): Promise<Response> {
  console.log('[Anthropic] Streaming with Messages API:', { model, messageCount: messages.length });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages,
      stream: true
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Anthropic] Streaming error:', error);
    throw new Error(`Anthropic API error: ${error}`);
  }

  return response;
}

/**
 * SSEストリームを統一フォーマットに正規化
 * 出力: data: {"type":"text.delta","delta":"content"}
 */
function normalizeSSEStream(
  sourceResponse: Response,
  provider: 'openai' | 'anthropic'
): ReadableStream<Uint8Array> {
  const reader = sourceResponse.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';

  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // process remaining buffer
            if (buffer.trim()) {
              processLines(buffer.split('\n'), controller, encoder, provider);
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          processLines(lines, controller, encoder, provider);
        }
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function processLines(
  lines: string[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  provider: 'openai' | 'anthropic'
): void {
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6).trim();
    if (data === '[DONE]') {
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      continue;
    }

    try {
      const parsed = JSON.parse(data);
      let delta: string | null = null;

      if (provider === 'openai') {
        delta = parsed.choices?.[0]?.delta?.content || null;
      } else if (provider === 'anthropic') {
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          delta = parsed.delta.text;
        }
      }

      if (delta) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text.delta', delta })}\n\n`));
      }
    } catch {
      // ignore parse errors
    }
  }
}

/**
 * 統一ストリーミングインターフェース
 * OpenAI/Anthropic どちらも共通フォーマットのSSEを返す
 */
export async function streamChatMessage(
  apiKeys: { openai: string; anthropic?: string },
  messages: HistoryMessage[],
  model: string,
  systemPrompt?: string,
  vectorStoreId?: string
): Promise<ReadableStream<Uint8Array>> {
  const provider = detectProvider(model);
  let instructions = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // RAG指示追加（OpenAIのみ）
  if (vectorStoreId && provider === 'openai') {
    instructions += RAG_INSTRUCTION_SUFFIX;
  }

  let sourceResponse: Response;

  if (provider === 'anthropic') {
    if (!apiKeys.anthropic) {
      throw new Error('Anthropic API key not configured');
    }
    sourceResponse = await streamAnthropic(apiKeys.anthropic, messages, model, instructions);
  } else {
    sourceResponse = await streamOpenAI(apiKeys.openai, messages, model, instructions, vectorStoreId);
  }

  return normalizeSSEStream(sourceResponse, provider);
}
