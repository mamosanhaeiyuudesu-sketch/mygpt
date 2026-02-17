-- conversation_id カラムを削除
-- SQLiteではALTER TABLE DROP COLUMNがサポートされないため、テーブル再作成で対応

CREATE TABLE chats_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  system_prompt TEXT,
  vector_store_id TEXT,
  use_context INTEGER NOT NULL DEFAULT 1,
  persona_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO chats_new (id, user_id, name, model, system_prompt, vector_store_id, use_context, persona_id, created_at, updated_at)
SELECT id, user_id, name, model, system_prompt, vector_store_id, use_context, persona_id, created_at, updated_at FROM chats;

DROP TABLE chats;
ALTER TABLE chats_new RENAME TO chats;

CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at DESC);
