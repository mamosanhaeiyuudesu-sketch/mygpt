<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">モデルを選択</h2>
      <p class="text-sm text-gray-400 mb-4">新しいチャットで使用するモデルを選択してください。</p>

      <div class="max-h-48 overflow-y-auto mb-4">
        <div v-if="isLoadingModels" class="text-center py-4 text-gray-400">
          Loading models...
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="model in models"
            :key="model.id"
            @click="selectedModel = model.id"
            class="w-full text-left px-4 py-3 rounded-lg transition-colors border"
            :class="selectedModel === model.id ? 'border-blue-500 bg-gray-800' : 'border-gray-700 hover:bg-gray-800'"
          >
            <div class="flex justify-between items-center">
              <span class="font-medium">{{ model.name }}</span>
              <span class="text-xs text-gray-500">{{ model.contextWindow }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ model.description }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ model.inputPrice }} / {{ model.outputPrice }}</div>
          </button>
        </div>
      </div>

      <!-- システムプロンプト入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">システムプロンプト（オプション）</label>
        <textarea
          v-model="systemPrompt"
          placeholder="カスタム指示を入力（空欄でデフォルト）"
          rows="2"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        ></textarea>
      </div>

      <!-- Vector Store ID入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">Vector Store ID（RAG用、オプション）</label>
        <input
          v-model="vectorStoreId"
          type="text"
          placeholder="vs_xxxxxxxxxxxxxxxx"
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
        <p class="text-xs text-gray-500 mt-1 ml-8">OFFにすると毎回高速に応答（会話履歴なし）</p>
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
interface Model {
  id: string;
  name: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
  description: string;
}

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
