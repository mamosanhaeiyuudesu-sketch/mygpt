<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">チャット設定</h2>
      <p class="text-sm text-gray-400 mb-4">モデル・システムプロンプト・Vector Storeを変更できます。</p>

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
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

      <div class="flex gap-2">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          キャンセル
        </button>
        <button
          @click="handleSave"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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

const props = defineProps<{
  modelValue: boolean;
  models: Model[];
  currentModel?: string | null;
  currentSystemPrompt?: string | null;
  currentVectorStoreId?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [model: string, systemPrompt: string | null, vectorStoreId: string | null];
}>();

const editModel = ref('');
const editSystemPrompt = ref('');
const editVectorStoreId = ref('');

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    editModel.value = props.currentModel || 'gpt-4o';
    editSystemPrompt.value = props.currentSystemPrompt || '';
    editVectorStoreId.value = props.currentVectorStoreId || '';
  }
});

const handleSave = () => {
  emit('save', editModel.value, editSystemPrompt.value.trim() || null, editVectorStoreId.value.trim() || null);
  emit('update:modelValue', false);
};
</script>
