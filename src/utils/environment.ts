/**
 * 環境判定ユーティリティ
 */

/**
 * 開発環境かどうかを判定
 */
export function isDevelopment(): boolean {
  return import.meta.dev;
}

/**
 * 本番環境かどうかを判定
 */
export function isProduction(): boolean {
  return !import.meta.dev;
}

/**
 * ローカル環境（localhost）かどうかを判定
 * - サーバーサイド: 常にtrue
 * - クライアントサイド: hostname が localhost または 127.0.0.1 の場合 true
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * デプロイ環境かどうかを判定
 */
export function isDeployedEnvironment(): boolean {
  return !isLocalEnvironment();
}
