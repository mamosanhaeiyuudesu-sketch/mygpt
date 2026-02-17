/**
 * AIプロバイダー判定ユーティリティ
 */

export type Provider = 'openai' | 'anthropic';

/**
 * モデル名からプロバイダーを判定
 */
export function detectProvider(model: string): Provider {
  if (model.startsWith('claude-')) {
    return 'anthropic';
  }
  return 'openai';
}

/**
 * モデルがRAG（file_search）をサポートするか
 */
export function supportsRAG(model: string): boolean {
  return detectProvider(model) === 'openai';
}
