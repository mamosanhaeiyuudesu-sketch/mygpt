/**
 * 環境変数ヘルパー
 * Cloudflare Workers と ローカル開発の両方に対応
 */
import type { H3Event } from 'h3';

interface CloudflareEnv {
  NUXT_OPENAI_API_KEY?: string;
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
 * D1データベースを取得
 */
export function getD1Database(event: H3Event): D1Database | null {
  const cfEnv = (event.context.cloudflare?.env as CloudflareEnv) || {};
  return cfEnv.DB || null;
}
