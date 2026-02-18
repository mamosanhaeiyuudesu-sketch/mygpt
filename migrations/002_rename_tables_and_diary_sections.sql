-- Migration: テーブルリネーム + diary_sections テーブル追加
-- 実行: npx wrangler d1 execute mygpt --file=migrations/002_rename_tables_and_diary_sections.sql

-- 1. テーブルリネーム
ALTER TABLE messages RENAME TO chat_messages;
ALTER TABLE chats RENAME TO chat_entries;
ALTER TABLE diaries RENAME TO diary_entries;

-- 1.5 chat_entries の name カラムを title にリネーム
ALTER TABLE chat_entries RENAME COLUMN name TO title;

-- 2. diary_entries に updated_at カラム追加
ALTER TABLE diary_entries ADD COLUMN updated_at INTEGER;
UPDATE diary_entries SET updated_at = created_at;

-- 3. diary_sections テーブル作成
CREATE TABLE diary_sections (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  text TEXT NOT NULL,
  duration INTEGER,
  completed_at INTEGER NOT NULL,
  FOREIGN KEY(entry_id) REFERENCES diary_entries(id) ON DELETE CASCADE
);

CREATE INDEX idx_diary_sections_entry ON diary_sections(entry_id, completed_at ASC);

-- 4. 既存データ移行（content JSONをdiary_sectionsに展開）
-- 注意: D1のSQLiteではJSON関数が使えるため、json_each()で展開
-- content が JSON配列 [{"text":"...","completedAt":123},...] の場合
INSERT INTO diary_sections (id, entry_id, text, duration, completed_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
  diary_entries.id as entry_id,
  json_extract(section.value, '$.text') as text,
  NULL as duration,
  json_extract(section.value, '$.completedAt') as completed_at
FROM diary_entries, json_each(diary_entries.content) as section
WHERE json_valid(diary_entries.content) AND json_type(diary_entries.content) = 'array';

-- content がプレーンテキスト（JSON配列でない）の場合
INSERT INTO diary_sections (id, entry_id, text, duration, completed_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) as id,
  id as entry_id,
  content as text,
  duration as duration,
  created_at as completed_at
FROM diary_entries
WHERE NOT json_valid(content) OR json_type(content) != 'array';

-- 5. updated_at を最新セクションの completed_at で更新
UPDATE diary_entries SET updated_at = (
  SELECT MAX(completed_at) FROM diary_sections WHERE entry_id = diary_entries.id
) WHERE EXISTS (SELECT 1 FROM diary_sections WHERE entry_id = diary_entries.id);

-- 6. 不要カラム削除
ALTER TABLE diary_entries DROP COLUMN content;
ALTER TABLE diary_entries DROP COLUMN duration;

-- 7. 新しいインデックス作成
CREATE INDEX IF NOT EXISTS idx_chat_entries_user_updated ON chat_entries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_updated ON diary_entries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);
