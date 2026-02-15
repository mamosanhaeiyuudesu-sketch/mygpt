/**
 * Preset データベース操作
 */
import type { H3Event } from 'h3';
import type { Preset } from './common';
import { getD1, memoryStore } from './common';

/**
 * 全プリセット取得
 */
export async function getAllPresets(event: H3Event): Promise<Preset[]> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(`
      SELECT id, name, system_prompt, vector_store_id, image_url, created_at
      FROM presets
      ORDER BY created_at ASC
    `).all();

    return (result.results || []) as unknown as Preset[];
  }

  return [...memoryStore.presets].sort((a, b) => a.created_at - b.created_at);
}

/**
 * プリセット作成
 */
export async function createPreset(
  event: H3Event,
  id: string,
  name: string,
  systemPrompt: string | null,
  vectorStoreId: string | null,
  imageUrl: string | null = null
): Promise<Preset> {
  const now = Date.now();
  const preset: Preset = {
    id,
    name,
    system_prompt: systemPrompt,
    vector_store_id: vectorStoreId,
    image_url: imageUrl,
    created_at: now
  };

  const db = getD1(event);

  if (db) {
    await db.prepare(`
      INSERT INTO presets (id, name, system_prompt, vector_store_id, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, name, systemPrompt, vectorStoreId, imageUrl, now).run();
  } else {
    memoryStore.presets.push(preset);
  }

  return preset;
}

/**
 * プリセット更新
 */
export async function updatePreset(
  event: H3Event,
  id: string,
  name: string,
  systemPrompt: string | null,
  vectorStoreId: string | null,
  imageUrl: string | null
): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare(`
      UPDATE presets SET name = ?, system_prompt = ?, vector_store_id = ?, image_url = ?
      WHERE id = ?
    `).bind(name, systemPrompt, vectorStoreId, imageUrl, id).run();
  } else {
    const preset = memoryStore.presets.find(p => p.id === id);
    if (preset) {
      preset.name = name;
      preset.system_prompt = systemPrompt;
      preset.vector_store_id = vectorStoreId;
      preset.image_url = imageUrl;
    }
  }
}

/**
 * プリセット削除
 */
export async function deletePreset(event: H3Event, id: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('DELETE FROM presets WHERE id = ?').bind(id).run();
  } else {
    memoryStore.presets = memoryStore.presets.filter(p => p.id !== id);
  }
}
