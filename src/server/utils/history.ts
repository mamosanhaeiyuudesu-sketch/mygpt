/**
 * メッセージ履歴管理ユーティリティ
 */

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * 直近Nラウンド分のメッセージを取得
 * @param messages - 全メッセージ（created_at ASC順）
 * @param maxRounds - 最大ラウンド数（1ラウンド = user + assistant）
 */
export function getContextMessages(
  messages: { role: string; content: string }[],
  maxRounds: number
): HistoryMessage[] {
  if (!messages || messages.length === 0) return [];

  const maxMessages = maxRounds * 2;
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
