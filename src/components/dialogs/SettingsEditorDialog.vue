<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <!-- ヘッダー：タイトル + プリセット選択 -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('settings.title') }}</h2>
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
        v-model:model="editModel"
        v-model:system-prompt="editSystemPrompt"
        v-model:vector-store-id="editVectorStoreId"
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
import { usePresets } from '~/composables/usePresets';

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

const { t } = useI18n();
const { presets, loadPresets, getPresetById } = usePresets();

// フォーム状態
const editModel = ref('');
const editSystemPrompt = ref('');
const editVectorStoreId = ref('');
const selectedPresetId = ref('');

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    editModel.value = props.currentModel || 'gpt-4o';
    editSystemPrompt.value = props.currentSystemPrompt || '';
    editVectorStoreId.value = props.currentVectorStoreId || '';
    selectedPresetId.value = '';
  }
});

const handlePresetChange = () => {
  if (!selectedPresetId.value) return;
  const preset = getPresetById(selectedPresetId.value);
  if (preset) {
    editSystemPrompt.value = preset.systemPrompt || '';
    editVectorStoreId.value = preset.vectorStoreId || '';
  }
};

const handleSave = () => {
  emit('save', editModel.value, editSystemPrompt.value.trim() || null, editVectorStoreId.value.trim() || null);
  emit('update:modelValue', false);
};
</script>
