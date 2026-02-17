/**
 * 環境変数ヘルパー
 * Cloudflare Workers と ローカル開発の両方に対応
 */
import type { H3Event } from 'h3';

interface CloudflareEnv {
  NUXT_OPENAI_API_KEY?: string;
  NUXT_ANTHROPIC_API_KEY?: string;
  NUXT_APP_PASSWORD?: string;
  NUXT_MAX_HISTORY_ROUNDS?: string;
  DB?: D1Database;
}

/**
 * OpenAI API キーを取得
 * Cloudflare Workers: event.context.cloudflare.env から取得
 * ローカル開発: useRuntimeConfig() から取得
 */
export function getOpenAIKey(event: H3Event): string {
  // Cloudflare Workers環境
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  if (cfEnv.NUXT_OPENAI_API_KEY) {
    return cfEnv.NUXT_OPENAI_API_KEY;
  }

  // ローカル開発環境 (runtimeConfig経由)
  const config = useRuntimeConfig();
  if (config.openaiApiKey) {
    return config.openaiApiKey;
  }

  throw new Error('OpenAI API key not configured');
}

/**
 * Anthropic API キーを取得
 */
export function getAnthropicKey(event: H3Event): string {
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  if (cfEnv.NUXT_ANTHROPIC_API_KEY) {
    return cfEnv.NUXT_ANTHROPIC_API_KEY;
  }

  const config = useRuntimeConfig();
  if (config.anthropicApiKey) {
    return config.anthropicApiKey;
  }

  throw new Error('Anthropic API key not configured');
}

/**
 * 履歴保持上限を取得（ラウンド数）
 * 1ラウンド = ユーザーメッセージ1件 + アシスタントメッセージ1件
 */
export function getMaxHistoryRounds(event: H3Event): number {
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  if (cfEnv.NUXT_MAX_HISTORY_ROUNDS) {
    return parseInt(cfEnv.NUXT_MAX_HISTORY_ROUNDS, 10);
  }

  const config = useRuntimeConfig();
  return parseInt(String(config.maxHistoryRounds || '20'), 10);
}

/**
 * アプリパスワードを取得
 */
export function getAppPassword(event: H3Event): string {
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  if (cfEnv.NUXT_APP_PASSWORD) {
    return cfEnv.NUXT_APP_PASSWORD;
  }

  const config = useRuntimeConfig();
  return config.appPassword || '';
}

/**
 * D1データベースを取得
 */
export function getD1Database(event: H3Event): D1Database | null {
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  return cfEnv.DB || null;
}
