/**
 * ペルソナ管理 Composable
 * ローカル開発: localStorage を使用
 * 本番環境: API を使用
 */
import { isLocalEnvironment } from '~/utils/environment';
import type { Persona } from '~/types';

const PERSONAS_STORAGE_KEY = 'mygpt_personas';
const OLD_PRESETS_STORAGE_KEY = 'mygpt_presets';

export const usePersonas = () => {
  const personas = ref<Persona[]>([]);
  const isLoading = ref(false);

  /**
   * ペルソナ一覧を読み込む
   */
  const loadPersonas = async () => {
    try {
      isLoading.value = true;
      if (isLocalEnvironment()) {
        // 旧キーからのマイグレーション
        const oldData = localStorage.getItem(OLD_PRESETS_STORAGE_KEY);
        if (oldData && !localStorage.getItem(PERSONAS_STORAGE_KEY)) {
          localStorage.setItem(PERSONAS_STORAGE_KEY, oldData);
          localStorage.removeItem(OLD_PRESETS_STORAGE_KEY);
        }
        const data = localStorage.getItem(PERSONAS_STORAGE_KEY);
        if (data) {
          personas.value = JSON.parse(data);
        }
      } else {
        const response = await fetch('/api/personas');
        if (response.ok) {
          const data = await response.json() as { personas: Persona[] };
          personas.value = data.personas;
        }
      }
    } catch (e) {
      console.error('Failed to load personas:', e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * ペルソナを作成する
   */
  const createPersona = async (
    name: string,
    systemPrompt: string | null,
    vectorStoreId: string | null,
    imageUrl: string | null = null
  ): Promise<Persona | null> => {
    try {
      const newPersona: Persona = {
        id: crypto.randomUUID(),
        name,
        systemPrompt,
        vectorStoreId,
        imageUrl,
        createdAt: Date.now()
      };

      if (isLocalEnvironment()) {
        personas.value.push(newPersona);
        localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas.value));
        return newPersona;
      } else {
        const response = await fetch('/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, systemPrompt, vectorStoreId, imageUrl })
        });
        if (response.ok) {
          const data = await response.json() as { persona: Persona };
          personas.value.push(data.persona);
          return data.persona;
        }
      }
    } catch (e) {
      console.error('Failed to create persona:', e);
    }
    return null;
  };

  /**
   * ペルソナを削除する
   */
  const deletePersona = async (id: string): Promise<boolean> => {
    try {
      if (isLocalEnvironment()) {
        personas.value = personas.value.filter(p => p.id !== id);
        localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas.value));
        return true;
      } else {
        const response = await fetch(`/api/personas/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          personas.value = personas.value.filter(p => p.id !== id);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to delete persona:', e);
    }
    return false;
  };

  /**
   * ペルソナを更新する
   */
  const updatePersona = async (
    id: string,
    name: string,
    systemPrompt: string | null,
    vectorStoreId: string | null,
    imageUrl: string | null = null
  ): Promise<boolean> => {
    try {
      const index = personas.value.findIndex(p => p.id === id);
      if (index === -1) return false;

      const updated: Persona = {
        ...personas.value[index],
        name,
        systemPrompt,
        vectorStoreId,
        imageUrl
      };

      if (isLocalEnvironment()) {
        personas.value[index] = updated;
        localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas.value));
        return true;
      } else {
        const response = await fetch(`/api/personas/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, systemPrompt, vectorStoreId, imageUrl })
        });
        if (response.ok) {
          personas.value[index] = updated;
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to update persona:', e);
    }
    return false;
  };

  /**
   * IDでペルソナを取得する
   */
  const getPersonaById = (id: string): Persona | undefined => {
    return personas.value.find(p => p.id === id);
  };

  return {
    personas: readonly(personas),
    isLoading: readonly(isLoading),
    loadPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    getPersonaById
  };
};
