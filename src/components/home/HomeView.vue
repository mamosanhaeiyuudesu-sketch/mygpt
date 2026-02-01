<template>
  <div class="flex-1 flex flex-col">
    <!-- 中央コンテンツ -->
    <div class="flex-1 flex items-center justify-center px-4">
      <div class="text-center">
        <h1 class="text-3xl md:text-4xl font-bold mb-3 md:mb-4">MyGPT</h1>
        <p class="text-gray-400 text-sm md:text-base mb-4">メッセージを入力して会話を始めましょう</p>

        <!-- モデル選択ドロップダウン -->
        <div class="flex items-center justify-center gap-2">
          <label class="text-sm text-gray-400">Model:</label>
          <select
            v-model="localSelectedModel"
            class="bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            :disabled="isLoadingModels"
          >
            <option v-if="isLoadingModels" value="">Loading...</option>
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name }} ({{ model.contextWindow }})
            </option>
          </select>
        </div>
        <p v-if="selectedModelInfo" class="text-xs text-gray-500 mt-2">
          {{ selectedModelInfo.description }}
        </p>

        <!-- システムプロンプト設定 -->
        <div class="mt-4 w-full max-w-md">
          <button
            @click="showAdvanced = !showAdvanced"
            class="text-sm text-gray-400 hover:text-white flex items-center gap-1 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            詳細設定
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" :class="showAdvanced ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <div v-if="showAdvanced" class="mt-2 space-y-3">
            <div>
              <label class="text-xs text-gray-400 block mb-1 text-left">システムプロンプト</label>
              <textarea
                v-model="localSystemPrompt"
                placeholder="カスタム指示を入力（空欄でデフォルト）"
                rows="3"
                class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1 text-left">例: 「あなたはプログラミングの専門家です」</p>
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1 text-left">Vector Store ID（RAG用）</label>
              <input
                v-model="localVectorStoreId"
                type="text"
                placeholder="vs_xxxxxxxxxxxxxxxx"
                class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1 text-left">OpenAI Vector Store IDを入力するとRAGが有効になります</p>
            </div>
            <div>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="localUseContext"
                  type="checkbox"
                  class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs text-gray-400">文脈を保持する</span>
              </label>
              <p class="text-xs text-gray-500 mt-1 ml-8">OFFにすると毎回高速に応答（会話履歴なし）</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 入力欄 -->
    <ChatInput :disabled="isLoading" @submit="handleSubmit" />
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
  models: Model[];
  selectedModel: string;
  isLoadingModels?: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  'update:selectedModel': [value: string];
  submit: [message: string, model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean];
}>();

const showAdvanced = ref(false);
const localSystemPrompt = ref('');
const localVectorStoreId = ref('');
const localUseContext = ref(true);

const localSelectedModel = computed({
  get: () => props.selectedModel,
  set: (value) => emit('update:selectedModel', value)
});

const selectedModelInfo = computed(() => {
  return props.models.find(m => m.id === props.selectedModel);
});

const handleSubmit = (message: string) => {
  emit('submit', message, props.selectedModel, localSystemPrompt.value.trim() || undefined, localVectorStoreId.value.trim() || undefined, localUseContext.value);
};
</script>
