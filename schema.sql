-- MyGPT Database Schema
-- Cloudflare D1 (SQLite) database schema for chat management

-- ユーザーテーブル
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  language TEXT NOT NULL DEFAULT 'ja', -- ユーザーの言語設定
  created_at INTEGER NOT NULL
);

-- ユーザー名の一意性インデックス
CREATE INDEX idx_users_name ON users(name);

-- チャットテーブル
-- 各チャットはOpenAI Conversation IDと紐付けられる
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                 -- 所属するユーザーID
  conversation_id TEXT UNIQUE NOT NULL,  -- OpenAI Conversations API の conversation ID
  name TEXT NOT NULL,                    -- チャット名（ユーザーが編集可能）
  model TEXT,                            -- 使用するOpenAIモデル
  system_prompt TEXT,                    -- システムプロンプト（カスタム指示）
  vector_store_id TEXT,                  -- Vector Store ID（RAG用）
  use_context INTEGER NOT NULL DEFAULT 1, -- 文脈を保持するか (0: false, 1: true)
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  updated_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーごとのチャット一覧取得用インデックス
CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at DESC);

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

-- プリセットテーブル
-- チャット設定のプリセットを保存
CREATE TABLE presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- プリセット名
  model TEXT NOT NULL,                   -- 使用するOpenAIモデル
  system_prompt TEXT,                    -- システムプロンプト（カスタム指示）
  vector_store_id TEXT,                  -- Vector Store ID（RAG用）
  use_context INTEGER NOT NULL DEFAULT 1, -- 文脈を保持するか (0: false, 1: true)
  created_at INTEGER NOT NULL            -- UNIXタイムスタンプ (ミリ秒)
);

-- プリセット作成日時でソートするためのインデックス
CREATE INDEX idx_presets_created_at ON presets(created_at);

-- 日記エントリテーブル
-- 音声入力で文字起こしした日記を保存
CREATE TABLE diary_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',        -- 日記タイトル
  content TEXT NOT NULL,                 -- 文字起こしされたテキスト
  duration INTEGER,                      -- 録音秒数
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーごとの日記一覧取得用インデックス
CREATE INDEX idx_diary_entries_user_created ON diary_entries(user_id, created_at DESC);
