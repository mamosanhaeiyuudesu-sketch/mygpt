/**
 * 認証・認可ユーティリティ
 */
import type { H3Event } from 'h3';
import { USER_COOKIE_NAME } from '~/server/utils/constants';
import { getChat } from '~/server/utils/db/chats';
import { getDiaryEntry } from '~/server/utils/db/diary';

/**
 * 認証済みユーザーIDを取得（未認証なら401エラー）
 */
export function requireAuth(event: H3Event): string {
  const userId = getCookie(event, USER_COOKIE_NAME);
  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }
  return userId;
}

/**
 * 必須ルートパラメータを取得（未指定なら400エラー）
 */
export function requireParam(event: H3Event, param: string, message: string): string {
  const value = getRouterParam(event, param);
  if (!value) {
    throw createError({
      statusCode: 400,
      statusMessage: message
    });
  }
  return value;
}

/**
 * チャットの所有者を検証（所有者でなければ403エラー）
 */
export async function assertChatOwner(event: H3Event, chatId: string, userId: string) {
  const chat = await getChat(event, chatId);
  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'チャットが見つかりません'
    });
  }
  if (chat.user_id !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'このチャットへのアクセス権がありません'
    });
  }
  return chat;
}

/**
 * 日記エントリの所有者を検証（所有者でなければ403エラー）
 */
export async function assertDiaryOwner(event: H3Event, entryId: string, userId: string) {
  const entry = await getDiaryEntry(event, entryId);
  if (!entry) {
    throw createError({
      statusCode: 404,
      statusMessage: '日記エントリが見つかりません'
    });
  }
  if (entry.user_id !== userId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'この日記エントリへのアクセス権がありません'
    });
  }
  return entry;
}
