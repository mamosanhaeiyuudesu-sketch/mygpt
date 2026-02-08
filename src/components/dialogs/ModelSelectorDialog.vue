<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">新しいチャット</h2>

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

      <div class="flex gap-2">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          @click="handleCreate"
          :disabled="!selectedModel"
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

// フォーム状態
const selectedModel = ref(props.defaultModel || 'gpt-4o');
const systemPrompt = ref('');
const vectorStoreId = ref('');
const useContext = ref(true);

// ダイアログが開かれたときにリセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    selectedModel.value = props.defaultModel || 'gpt-4o';
    systemPrompt.value = '';
    vectorStoreId.value = '';
    useContext.value = true;
  }
});

const handleCreate = () => {
  if (!selectedModel.value) return;
  emit('create', selectedModel.value, systemPrompt.value.trim() || undefined, vectorStoreId.value.trim() || undefined, useContext.value);
  emit('update:modelValue', false);
};
</script>
