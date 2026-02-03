<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">チャット設定</h2>

      <!-- プリセット選択 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">プリセット</label>
        <div class="flex gap-2">
          <select
            v-model="selectedPresetId"
            @change="handlePresetChange"
            class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">カスタム</option>
            <option v-for="preset in presets" :key="preset.id" :value="preset.id">
              {{ preset.name }}
            </option>
          </select>
          <button
            v-if="selectedPresetId"
            @click="handleDeletePreset"
            class="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors text-sm"
            title="プリセットを削除"
          >
            削除
          </button>
        </div>
      </div>

      <!-- モデル選択 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">モデル</label>
        <select
          v-model="editModel"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="model in models" :key="model.id" :value="model.id">
            {{ model.name }} ({{ model.contextWindow }})
          </option>
        </select>
      </div>

      <!-- システムプロンプト入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">システムプロンプト</label>
        <textarea
          v-model="editSystemPrompt"
          placeholder="カスタム指示を入力（空欄でデフォルト）"
          rows="3"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
      </div>

      <!-- Vector Store ID入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">Vector Store ID（RAG用）</label>
        <input
          v-model="editVectorStoreId"
          type="text"
          placeholder="vs_xxxxxxxxxxxxxxxx（空欄で無効）"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- 文脈保持設定 -->
      <div class="mb-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="editUseContext"
            type="checkbox"
            class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-400">文脈を保持する</span>
        </label>
        <p class="text-xs text-gray-500 mt-1 ml-8">OFFにすると会話履歴を使わず、毎回高速に応答します</p>
      </div>

      <!-- プリセット保存 -->
      <div class="mb-4 pt-3 border-t border-gray-700">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="saveAsPreset"
            type="checkbox"
            class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-400">この設定をプリセットとして保存</span>
        </label>
        <input
          v-if="saveAsPreset"
          v-model="presetName"
          type="text"
          placeholder="プリセット名を入力"
          class="w-full mt-2 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="flex gap-2">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          @click="handleSave"
          :disabled="saveAsPreset && !presetName.trim()"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Model {
  id: string;
  name: string;
  contextWindow: string;
}

interface Preset {
  id: string;
  name: string;
  model: string;
  system_prompt: string | null;
  vector_store_id: string | null;
  use_context: boolean;
}

const PRESETS_STORAGE_KEY = 'mygpt_presets';
const isDev = import.meta.dev;

const props = defineProps<{
  modelValue: boolean;
  models: Model[];
  currentModel?: string | null;
  currentSystemPrompt?: string | null;
  currentVectorStoreId?: string | null;
  currentUseContext?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean];
}>();

const editModel = ref('');
const editSystemPrompt = ref('');
const editVectorStoreId = ref('');
const editUseContext = ref(true);

// 初期値（カスタムに戻す用）
const initialModel = ref('');
const initialSystemPrompt = ref('');
const initialVectorStoreId = ref('');
const initialUseContext = ref(true);

// プリセット関連
const presets = ref<Preset[]>([]);
const selectedPresetId = ref('');
const saveAsPreset = ref(false);
const presetName = ref('');

// プリセットを読み込み
const loadPresets = async () => {
  try {
    if (isDev) {
      // ローカル開発: LocalStorage
      const data = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (data) {
        presets.value = JSON.parse(data);
      }
    } else {
      // 本番: API
      const response = await fetch('/api/presets');
      if (response.ok) {
        const data = await response.json() as { presets: Preset[] };
        presets.value = data.presets;
      }
    }
  } catch (e) {
    console.error('Failed to load presets:', e);
  }
};

// プリセットを作成
const createPreset = async (name: string, model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean) => {
  try {
    const newPreset: Preset = {
      id: crypto.randomUUID(),
      name,
      model,
      system_prompt: systemPrompt,
      vector_store_id: vectorStoreId,
      use_context: useContext,
    };

    if (isDev) {
      // ローカル開発: LocalStorage
      presets.value.push(newPreset);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value));
    } else {
      // 本番: API
      const response = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model, systemPrompt, vectorStoreId, useContext })
      });
      if (response.ok) {
        const data = await response.json() as { preset: Preset };
        presets.value.push(data.preset);
      }
    }
  } catch (e) {
    console.error('Failed to create preset:', e);
  }
};

// プリセット選択時に設定を反映
const handlePresetChange = () => {
  if (!selectedPresetId.value) {
    // カスタムに戻す場合は初期値を復元
    editModel.value = initialModel.value;
    editSystemPrompt.value = initialSystemPrompt.value;
    editVectorStoreId.value = initialVectorStoreId.value;
    editUseContext.value = initialUseContext.value;
    return;
  }
  const preset = presets.value.find(p => p.id === selectedPresetId.value);
  if (preset) {
    editModel.value = preset.model;
    editSystemPrompt.value = preset.system_prompt || '';
    editVectorStoreId.value = preset.vector_store_id || '';
    editUseContext.value = preset.use_context;
  }
};

// プリセット削除
const handleDeletePreset = async () => {
  if (!selectedPresetId.value) return;
  if (!confirm('このプリセットを削除しますか？')) return;

  try {
    if (isDev) {
      // ローカル開発: LocalStorage
      presets.value = presets.value.filter(p => p.id !== selectedPresetId.value);
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value));
      selectedPresetId.value = '';
    } else {
      // 本番: API
      const response = await fetch(`/api/presets/${selectedPresetId.value}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        presets.value = presets.value.filter(p => p.id !== selectedPresetId.value);
        selectedPresetId.value = '';
      }
    }
  } catch (e) {
    console.error('Failed to delete preset:', e);
  }
};

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    // 初期値を保存
    initialModel.value = props.currentModel || 'gpt-4o';
    initialSystemPrompt.value = props.currentSystemPrompt || '';
    initialVectorStoreId.value = props.currentVectorStoreId || '';
    initialUseContext.value = props.currentUseContext ?? true;
    // 編集用にも設定
    editModel.value = initialModel.value;
    editSystemPrompt.value = initialSystemPrompt.value;
    editVectorStoreId.value = initialVectorStoreId.value;
    editUseContext.value = initialUseContext.value;
    selectedPresetId.value = '';
    saveAsPreset.value = false;
    presetName.value = '';
  }
});

const handleSave = async () => {
  // プリセット保存
  if (saveAsPreset.value && presetName.value.trim()) {
    await createPreset(
      presetName.value.trim(),
      editModel.value,
      editSystemPrompt.value.trim() || null,
      editVectorStoreId.value.trim() || null,
      editUseContext.value
    );
  }

  emit('save', editModel.value, editSystemPrompt.value.trim() || null, editVectorStoreId.value.trim() || null, editUseContext.value);
  emit('update:modelValue', false);
};
</script>
