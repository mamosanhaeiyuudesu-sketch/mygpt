/**
 * チャットストリーミング用ユーティリティ
 * SSEストリームの解析とメッセージ更新ロジックを提供
 */
import type { Ref } from 'vue';
import type { Message } from '~/types';

/**
 * SSEストリームからテキストを抽出するパーサー
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          // Responses APIのストリーミング形式に対応
          if (parsed.type === 'response.output_text.delta' && parsed.delta) {
            fullContent += parsed.delta;
            onChunk(fullContent);
          }
        } catch {
          // JSON解析エラーは無視
        }
      }
    }
  }

  return fullContent;
}

/**
 * メッセージ配列内の特定メッセージの内容を更新する
 * リアクティビティを確実にトリガーするため新しい配列を作成
 */
export function updateMessageContent(
  messages: Ref<Message[]>,
  messageId: string,
  content: string
): void {
  const msgIndex = messages.value.findIndex(m => m.id === messageId);
  if (msgIndex !== -1) {
    messages.value = messages.value.map((m, i) =>
      i === msgIndex ? { ...m, content } : m
    );
  }
}
