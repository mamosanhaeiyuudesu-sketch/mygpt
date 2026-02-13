/**
 * 暗号化ユーティリティ
 * ユーザー名ベースの AES-GCM 暗号化/復号化
 * D1に保存するデータを暗号化し、CloudflareのUI上で平文が見えないようにする
 */
import type { H3Event } from 'h3';
import { getUserById } from '~/server/utils/db/users';
import { getD1 } from '~/server/utils/db/common';
import { USER_COOKIE_NAME } from '~/server/utils/constants';

const ENCRYPTION_PREFIX = 'ENC:';
const DEFAULT_SALT = 'mygpt-default-salt-2024';

// 鍵キャッシュ（PBKDF2の繰り返し呼び出しを回避）
const keyCache = new Map<string, CryptoKey>();

/**
 * 環境変数からsaltを取得
 */
function getEncryptionSalt(event: H3Event): string {
  const cfEnv = (event.context.cloudflare?.env as { ENCRYPTION_SALT?: string }) || {};
  if (cfEnv.ENCRYPTION_SALT) {
    return cfEnv.ENCRYPTION_SALT;
  }

  const config = useRuntimeConfig();
  return (config as Record<string, string>).encryptionSalt || DEFAULT_SALT;
}

/**
 * ユーザー名からAES-GCM暗号鍵を導出（PBKDF2）
 */
async function deriveKey(userName: string, salt: string): Promise<CryptoKey> {
  const cacheKey = `${userName}:${salt}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userName),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(cacheKey, key);
  return key;
}

/**
 * リクエストから暗号鍵を取得
 * D1がない場合（ローカル環境）はnullを返す
 */
export async function getEncryptionKey(event: H3Event): Promise<CryptoKey | null> {
  const db = getD1(event);
  if (!db) return null;

  const userId = getCookie(event, USER_COOKIE_NAME);
  if (!userId) return null;

  const user = await getUserById(event, userId);
  if (!user) return null;

  const salt = getEncryptionSalt(event);
  return deriveKey(user.name, salt);
}

/**
 * テキストを暗号化
 * 戻り値: "ENC:" + base64(iv + ciphertext)
 */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // iv(12bytes) + ciphertext を結合
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Base64エンコード
  const base64 = btoa(String.fromCharCode(...combined));
  return ENCRYPTION_PREFIX + base64;
}

/**
 * 暗号文を復号化
 * ENC: プレフィックスがなければ平文としてそのまま返す（後方互換性）
 */
export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return ciphertext;
  }

  const base64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * 暗号鍵がある場合のみ暗号化するヘルパー
 */
export async function encryptIfKey(text: string, key: CryptoKey | null): Promise<string> {
  if (!key) return text;
  return encrypt(text, key);
}

/**
 * 暗号鍵がある場合のみ復号化するヘルパー
 */
export async function decryptIfKey(text: string, key: CryptoKey | null): Promise<string> {
  if (!key) return text;
  return decrypt(text, key);
}

/**
 * null/undefinedを考慮した暗号化ヘルパー
 */
export async function encryptNullable(text: string | null | undefined, key: CryptoKey | null): Promise<string | null | undefined> {
  if (text == null || !key) return text;
  return encrypt(text, key);
}

/**
 * null/undefinedを考慮した復号化ヘルパー
 */
export async function decryptNullable(text: string | null | undefined, key: CryptoKey | null): Promise<string | null | undefined> {
  if (text == null || !key) return text;
  return decrypt(text, key);
}
