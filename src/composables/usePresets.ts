/**
 * プリセット管理 Composable
 * ローカル開発: localStorage を使用
 * 本番環境: API を使用
 */
import { isLocalEnvironment } from '~/utils/environment';
import type { Preset } from '~/types';

const PRESETS_STORAGE_KEY = 'mygpt_presets';

export const usePresets = () => {
  const presets = ref<Preset[]>([]);
  const isLoading = ref(false);

  /**
   * プリセット一覧を読み込む
   */
  const loadPresets = async () => {
    try {
      isLoading.value = true;
      if (isLocalEnvironment()) {
        const data = localStorage.getItem(PRESETS_STORAGE_KEY);
        if (data) {
          presets.value = JSON.parse(data);
        }
      } else {
        const response = await fetch('/api/presets');
        if (response.ok) {
          const data = await response.json() as { presets: Preset[] };
          presets.value = data.presets;
        }
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * プリセットを作成する
   */
  const createPreset = async (
    name: string,
    model: string,
    systemPrompt: string | null,
    vectorStoreId: string | null,
    useContext: boolean
  ): Promise<Preset | null> => {
    try {
      const newPreset: Preset = {
        id: crypto.randomUUID(),
        name,
        model,
        systemPrompt,
        vectorStoreId,
        useContext,
        createdAt: Date.now()
      };

      if (isLocalEnvironment()) {
        presets.value.push(newPreset);
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value));
        return newPreset;
      } else {
        const response = await fetch('/api/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, model, systemPrompt, vectorStoreId, useContext })
        });
        if (response.ok) {
          const data = await response.json() as { preset: Preset };
          presets.value.push(data.preset);
          return data.preset;
        }
      }
    } catch (e) {
      console.error('Failed to create preset:', e);
    }
    return null;
  };

  /**
   * プリセットを削除する
   */
  const deletePreset = async (id: string): Promise<boolean> => {
    try {
      if (isLocalEnvironment()) {
        presets.value = presets.value.filter(p => p.id !== id);
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value));
        return true;
      } else {
        const response = await fetch(`/api/presets/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          presets.value = presets.value.filter(p => p.id !== id);
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to delete preset:', e);
    }
    return false;
  };

  /**
   * プリセットを更新する
   */
  const updatePreset = async (
    id: string,
    name: string,
    model: string,
    systemPrompt: string | null,
    vectorStoreId: string | null,
    useContext: boolean
  ): Promise<boolean> => {
    try {
      const index = presets.value.findIndex(p => p.id === id);
      if (index === -1) return false;

      const updated: Preset = {
        ...presets.value[index],
        name,
        model,
        systemPrompt,
        vectorStoreId,
        useContext
      };

      if (isLocalEnvironment()) {
        presets.value[index] = updated;
        localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value));
        return true;
      } else {
        const response = await fetch(`/api/presets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, model, systemPrompt, vectorStoreId, useContext })
        });
        if (response.ok) {
          presets.value[index] = updated;
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to update preset:', e);
    }
    return false;
  };

  /**
   * IDでプリセットを取得する
   */
  const getPresetById = (id: string): Preset | undefined => {
    return presets.value.find(p => p.id === id);
  };

  return {
    presets: readonly(presets),
    isLoading: readonly(isLoading),
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    getPresetById
  };
};
