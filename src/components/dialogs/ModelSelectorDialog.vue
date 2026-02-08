<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <!-- ヘッダー：タイトル + プリセット選択 -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('sidebar.newChat') }}</h2>
        <select
          v-model="selectedPresetId"
          @change="handlePresetChange"
          class="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[180px]"
        >
          <option value="">{{ t('settings.preset.custom') }}</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
      </div>

      <ChatSettingsForm
        :models="models"
        v-model:model="selectedModel"
        v-model:system-prompt="systemPrompt"
        v-model:vector-store-id="vectorStoreId"
        v-model:use-context="useContext"
        :is-loading-models="isLoadingModels"
      />

      <div class="flex gap-2 mt-4">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {{ t('button.cancel') }}
        </button>
        <button
          @click="handleCreate"
          :disabled="!selectedModel"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {{ t('model.create') }}
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

const { t } = useI18n();
const { presets, loadPresets, getPresetById } = usePresets();

// フォーム状態
const selectedModel = ref(props.defaultModel || 'gpt-4o');
const systemPrompt = ref('');
const vectorStoreId = ref('');
const useContext = ref(true);
const selectedPresetId = ref('');

// ダイアログが開かれたときにリセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    selectedModel.value = props.defaultModel || 'gpt-4o';
    systemPrompt.value = '';
    vectorStoreId.value = '';
    useContext.value = true;
    selectedPresetId.value = '';
  }
});

const handlePresetChange = () => {
  if (!selectedPresetId.value) {
    selectedModel.value = props.defaultModel || 'gpt-4o';
    systemPrompt.value = '';
    vectorStoreId.value = '';
    useContext.value = true;
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

const handleCreate = () => {
  if (!selectedModel.value) return;
  emit('create', selectedModel.value, systemPrompt.value.trim() || undefined, vectorStoreId.value.trim() || undefined, useContext.value);
  emit('update:modelValue', false);
};
</script>
