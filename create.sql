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

-- チャットエントリテーブル
CREATE TABLE chat_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,                 -- 所属するユーザーID
  title TEXT NOT NULL,                   -- チャットタイトル（ユーザーが編集可能）
  model TEXT,                            -- 使用するOpenAIモデル
  system_prompt TEXT,                    -- システムプロンプト（カスタム指示）
  vector_store_id TEXT,                  -- Vector Store ID（RAG用）
  use_context INTEGER NOT NULL DEFAULT 1, -- 文脈保持（1=ON, 0=OFF）
  persona_id TEXT,                       -- 参照するペルソナID
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  updated_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーごとのチャット一覧取得用インデックス
CREATE INDEX idx_chat_entries_user_updated ON chat_entries(user_id, updated_at DESC);

-- チャットメッセージテーブル
-- ユーザーとアシスタント両方のメッセージを保存
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,                 -- 所属するチャットID
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),  -- メッセージの送信者
  content TEXT NOT NULL,                 -- メッセージ本文
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(chat_id) REFERENCES chat_entries(id) ON DELETE CASCADE
);

-- メッセージ取得時のクエリ最適化用インデックス
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);

-- ペルソナテーブル
-- チャット設定のペルソナを保存
CREATE TABLE personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- ペルソナ名
  system_prompt TEXT,                    -- システムプロンプト（カスタム指示）
  vector_store_id TEXT,                  -- Vector Store ID（RAG用）
  image_url TEXT,                        -- ペルソナ画像（Base64 Data URL）
  created_at INTEGER NOT NULL            -- UNIXタイムスタンプ (ミリ秒)
);

-- ペルソナ作成日時でソートするためのインデックス
CREATE INDEX idx_personas_created_at ON personas(created_at);

-- 日記エントリテーブル
CREATE TABLE diary_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',        -- 日記タイトル
  created_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  updated_at INTEGER NOT NULL,           -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ユーザーごとの日記一覧取得用インデックス（最終更新日時でソート）
CREATE INDEX idx_diary_entries_user_updated ON diary_entries(user_id, updated_at DESC);

-- 日記セクションテーブル
-- 各投稿（音声入力/テキスト入力）を個別に保存
CREATE TABLE diary_sections (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,                -- 所属する日記エントリID
  text TEXT NOT NULL,                    -- セクション本文
  duration INTEGER,                      -- 録音秒数
  completed_at INTEGER NOT NULL,         -- UNIXタイムスタンプ (ミリ秒)
  FOREIGN KEY(entry_id) REFERENCES diary_entries(id) ON DELETE CASCADE
);

-- エントリごとのセクション取得用インデックス
CREATE INDEX idx_diary_sections_entry ON diary_sections(entry_id, completed_at ASC);
