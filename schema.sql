-- MyGPT Database Schema
-- Cloudflare D1 (SQLite) database schema for chat management

-- チャットテーブル
-- 各チャットはOpenAI Conversation IDと紐付けられる
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,  -- OpenAI Conversations API の conversation ID
  name TEXT NOT NULL,                    -- チャット名（ユーザーが編集可能）
  model TEXT,                            -- 使用するOpenAIモデル
  system_prompt TEXT,                    -- システムプロンプト（カスタム指示）
  vector_store_id TEXT,                  -- 将来の拡張用（RAG機能など）
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  updated_at INTEGER NOT NULL            -- UNIXタイムスタンプ (ミリ秒)
);

-- 更新日時でソートするためのインデックス（チャット一覧表示用）
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);

-- メッセージテーブル
-- ユーザーとアシスタント両方のメッセージを保存
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,                 -- 所属するチャットID
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),  -- メッセージの送信者
  content TEXT NOT NULL,                 -- メッセージ本文
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- メッセージ取得時のクエリ最適化用インデックス
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
