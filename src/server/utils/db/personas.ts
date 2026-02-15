/**
 * Persona データベース操作
 */
import type { H3Event } from 'h3';
import type { Persona } from './common';
import { getD1, memoryStore } from './common';

/**
 * 全ペルソナ取得
 */
export async function getAllPersonas(event: H3Event): Promise<Persona[]> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(`
      SELECT id, name, system_prompt, vector_store_id, image_url, created_at
      FROM personas
      ORDER BY created_at ASC
    `).all();

    return (result.results || []) as unknown as Persona[];
  }

  return [...memoryStore.personas].sort((a, b) => a.created_at - b.created_at);
}

/**
 * ペルソナをIDで取得
 */
export async function getPersonaById(event: H3Event, id: string): Promise<Persona | null> {
  const db = getD1(event);

  if (db) {
    const result = await db.prepare(
      'SELECT * FROM personas WHERE id = ?'
    ).bind(id).first() as Persona | null;
    return result;
  }

  return memoryStore.personas.find(p => p.id === id) || null;
}

/**
 * ペルソナ作成
 */
export async function createPersona(
  event: H3Event,
  id: string,
  name: string,
  systemPrompt: string | null,
  vectorStoreId: string | null,
  imageUrl: string | null = null
): Promise<Persona> {
  const now = Date.now();
  const persona: Persona = {
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
      INSERT INTO personas (id, name, system_prompt, vector_store_id, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, name, systemPrompt, vectorStoreId, imageUrl, now).run();
  } else {
    memoryStore.personas.push(persona);
  }

  return persona;
}

/**
 * ペルソナ更新
 */
export async function updatePersona(
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
      UPDATE personas SET name = ?, system_prompt = ?, vector_store_id = ?, image_url = ?
      WHERE id = ?
    `).bind(name, systemPrompt, vectorStoreId, imageUrl, id).run();
  } else {
    const persona = memoryStore.personas.find(p => p.id === id);
    if (persona) {
      persona.name = name;
      persona.system_prompt = systemPrompt;
      persona.vector_store_id = vectorStoreId;
      persona.image_url = imageUrl;
    }
  }
}

/**
 * ペルソナ削除
 */
export async function deletePersona(event: H3Event, id: string): Promise<void> {
  const db = getD1(event);

  if (db) {
    await db.prepare('DELETE FROM personas WHERE id = ?').bind(id).run();
  } else {
    memoryStore.personas = memoryStore.personas.filter(p => p.id !== id);
  }
}
