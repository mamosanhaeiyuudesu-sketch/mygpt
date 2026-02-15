/**
 * チャットストリーミング用ユーティリティ
 * SSEストリームの解析とメッセージ更新ロジックを提供
 */
import type { Ref } from 'vue';
import type { Message } from '~/types';
import { generateMessageId } from '~/utils/storage';

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

/**
 * sendMessage の共通ロジック
 * メッセージ作成、SSEストリーム解析、エラーハンドリングを共通化
 */
export interface SendMessageOptions {
  messages: Ref<Message[]>;
  isLoading: Ref<boolean>;
  fetchStream: (content: string) => Promise<Response>;
  onSuccess: (userMessage: Message, finalContent: string) => Promise<void>;
  onError?: (userMessage: Message, assistantMessage: Message) => void;
}

export async function executeSendMessage(
  content: string,
  options: SendMessageOptions
): Promise<{ userMessage: Message; assistantMessage: Message }> {
  const { messages, isLoading, fetchStream, onSuccess, onError } = options;
  const now = Date.now();

  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content,
    createdAt: now
  };
  messages.value.push(userMessage);

  const assistantMessage: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content: '',
    createdAt: Date.now()
  };
  messages.value.push(assistantMessage);

  try {
    isLoading.value = true;

    const response = await fetchStream(content);

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const finalContent = await parseSSEStream(reader, (text) => {
      updateMessageContent(messages, assistantMessage.id, text);
    });
    updateMessageContent(messages, assistantMessage.id, finalContent);

    await onSuccess(userMessage, finalContent);

    return { userMessage, assistantMessage };
  } catch (error) {
    messages.value = messages.value.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id);
    onError?.(userMessage, assistantMessage);
    console.error('Error sending message:', error);
    throw error;
  } finally {
    isLoading.value = false;
  }
}
