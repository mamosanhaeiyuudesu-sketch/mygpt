<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">{{ t('settings.title') }}</h2>

      <ChatSettingsForm
        :models="models"
        v-model:model="editModel"
        v-model:system-prompt="editSystemPrompt"
        v-model:vector-store-id="editVectorStoreId"
        v-model:use-context="editUseContext"
      />

      <div class="flex gap-2 mt-4">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {{ t('button.cancel') }}
        </button>
        <button
          @click="handleSave"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          {{ t('settings.save') }}
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
  currentModel?: string | null;
  currentSystemPrompt?: string | null;
  currentVectorStoreId?: string | null;
  currentUseContext?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean];
}>();

const { t } = useI18n();

// フォーム状態
const editModel = ref('');
const editSystemPrompt = ref('');
const editVectorStoreId = ref('');
const editUseContext = ref(true);

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    editModel.value = props.currentModel || 'gpt-4o';
    editSystemPrompt.value = props.currentSystemPrompt || '';
    editVectorStoreId.value = props.currentVectorStoreId || '';
    editUseContext.value = props.currentUseContext ?? true;
  }
});

const handleSave = () => {
  emit('save', editModel.value, editSystemPrompt.value.trim() || null, editVectorStoreId.value.trim() || null, editUseContext.value);
  emit('update:modelValue', false);
};
</script>
