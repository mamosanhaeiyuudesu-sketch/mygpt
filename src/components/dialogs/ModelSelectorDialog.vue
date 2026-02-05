<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">新しいチャット</h2>

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
        <div v-if="isLoadingModels" class="text-center py-2 text-gray-400 text-sm">
          Loading models...
        </div>
        <select
          v-else
          v-model="selectedModel"
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
          v-model="systemPrompt"
          placeholder="カスタム指示を入力（空欄でデフォルト）"
          rows="3"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
      </div>

      <!-- Vector Store ID入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">Vector Store ID（RAG用）</label>
        <input
          v-model="vectorStoreId"
          type="text"
          placeholder="vs_xxxxxxxxxxxxxxxx（空欄で無効）"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- 文脈保持設定 -->
      <div class="mb-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            v-model="useContext"
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
          @click="handleCreate"
          :disabled="!selectedModel || (saveAsPreset && !presetName.trim())"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          作成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { usePresets } from '~/composables/usePresets';

const props = defineProps<{
  modelValue: boolean;
  models: Model[];
  isLoadingModels?: boolean;
  defaultModel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  create: [model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean];
}>();

// プリセット管理
const { presets, loadPresets, createPreset, deletePreset, getPresetById } = usePresets();

// フォーム状態
const selectedModel = ref(props.defaultModel || 'gpt-4o');
const systemPrompt = ref('');
const vectorStoreId = ref('');
const useContext = ref(true);

// 初期値（カスタムに戻す用）
const initialModel = ref('');
const initialSystemPrompt = ref('');
const initialVectorStoreId = ref('');
const initialUseContext = ref(true);

// プリセット選択状態
const selectedPresetId = ref('');
const saveAsPreset = ref(false);
const presetName = ref('');

// プリセット選択時に設定を反映
const handlePresetChange = () => {
  if (!selectedPresetId.value) {
    selectedModel.value = initialModel.value;
    systemPrompt.value = initialSystemPrompt.value;
    vectorStoreId.value = initialVectorStoreId.value;
    useContext.value = initialUseContext.value;
    return;
  }
  const preset = getPresetById(selectedPresetId.value);
  if (preset) {
    selectedModel.value = preset.model;
    systemPrompt.value = preset.systemPrompt || '';
    vectorStoreId.value = preset.vectorStoreId || '';
    useContext.value = preset.useContext;
  }
};

// プリセット削除
const handleDeletePreset = async () => {
  if (!selectedPresetId.value) return;
  if (!confirm('このプリセットを削除しますか？')) return;

  const success = await deletePreset(selectedPresetId.value);
  if (success) {
    selectedPresetId.value = '';
  }
};

// ダイアログが開かれたときにリセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    initialModel.value = props.defaultModel || 'gpt-4o';
    initialSystemPrompt.value = '';
    initialVectorStoreId.value = '';
    initialUseContext.value = true;
    selectedModel.value = initialModel.value;
    systemPrompt.value = initialSystemPrompt.value;
    vectorStoreId.value = initialVectorStoreId.value;
    useContext.value = initialUseContext.value;
    selectedPresetId.value = '';
    saveAsPreset.value = false;
    presetName.value = '';
  }
});

const handleCreate = async () => {
  if (!selectedModel.value) return;

  if (saveAsPreset.value && presetName.value.trim()) {
    await createPreset(
      presetName.value.trim(),
      selectedModel.value,
      systemPrompt.value.trim() || null,
      vectorStoreId.value.trim() || null,
      useContext.value
    );
  }

  emit('create', selectedModel.value, systemPrompt.value.trim() || undefined, vectorStoreId.value.trim() || undefined, useContext.value);
  emit('update:modelValue', false);
};
</script>
