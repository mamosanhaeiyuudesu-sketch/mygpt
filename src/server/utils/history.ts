/**
 * メッセージ履歴管理ユーティリティ
 */

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 直近N件のメッセージを取得
 * @param messages - 全メッセージ（created_at ASC順）
 * @param maxMessages - 最大メッセージ数
 */
export function getContextMessages(
  messages: { role: string; content: string }[],
  maxMessages: number
): HistoryMessage[] {
  if (!messages || messages.length === 0) return [];

  const recent = messages.slice(-maxMessages);

  return recent.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));
}

/**
 * 履歴 + 現在のユーザーメッセージを結合
 */
export function buildMessagesWithHistory(
  history: HistoryMessage[],
  currentMessage: string
): HistoryMessage[] {
  return [
    ...history,
    { role: 'user' as const, content: currentMessage }
  ];
}
