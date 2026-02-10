/**
 * データベース共通ユーティリティ
 * 型定義、インメモリストレージ、D1取得
 */
import type { H3Event } from 'h3';

export interface User {
  id: string;
  name: string;
  language?: string;
  created_at: number;
}

export interface Chat {
  user_id: string;
  id: string;
  conversation_id: string;
  name: string;
  model?: string | null;
  system_prompt?: string | null;
  vector_store_id?: string | null;
  use_context?: boolean | null;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

export interface Preset {
  id: string;
  name: string;
  model: string;
  system_prompt: string | null;
  vector_store_id: string | null;
  use_context: boolean;
  created_at: number;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  content: string;
  duration: number | null;
  created_at: number;
}

// インメモリストレージ（ローカル開発用フォールバック）
export const memoryStore = {
  users: [] as User[],
  chats: [] as Chat[],
  messages: [] as Message[],
  presets: [] as Preset[],
  diaryEntries: [] as DiaryEntry[]
};

/**
 * D1データベースを取得（Cloudflare Workers環境のみ）
 */
export function getD1(event: H3Event): D1Database | null {
  const cfEnv = event.context.cloudflare?.env as { DB?: D1Database } | undefined;
  return cfEnv?.DB || null;
}

/**
 * ユニークID生成
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
