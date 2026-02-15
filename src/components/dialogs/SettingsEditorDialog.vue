<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">{{ t('settings.title') }}</h2>

      <div class="space-y-4">
        <!-- モデル選択 -->
        <div>
          <label class="text-sm text-gray-400 block mb-2">{{ t('settings.model') }}</label>
          <select
            v-model="editModel"
            class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="m in models" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.contextWindow }})
            </option>
          </select>
        </div>

        <!-- ペルソナ選択（カード形式） -->
        <PresetCardGrid :presets="presets" :selected-id="selectedPresetId" @select="selectPreset" />

        <!-- 文脈保持設定 -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm text-gray-400">{{ t('settings.useContext') }}</label>
            <p class="text-xs text-gray-500 mt-0.5">{{ t('settings.useContext.description') }}</p>
          </div>
          <ToggleSwitch v-model="editUseContext" />
        </div>
      </div>

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
  currentUseContext?: boolean;
  currentPresetName?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean, presetName: string | null];
}>();

const { t } = useI18n();
const { presets, loadPresets, getPresetById } = usePresets();

// フォーム状態
const editModel = ref('');
const editSystemPrompt = ref('');
const editVectorStoreId = ref('');
const editUseContext = ref(true);
const selectedPresetId = ref('');

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    editModel.value = props.currentModel || 'gpt-4o';
    editSystemPrompt.value = props.currentSystemPrompt || '';
    editVectorStoreId.value = props.currentVectorStoreId || '';
    editUseContext.value = props.currentUseContext !== false;
    // 現在のpresetNameからプリセットIDを復元
    selectedPresetId.value = '';
    if (props.currentPresetName) {
      nextTick(() => {
        const matchingPreset = presets.value.find(p => p.name === props.currentPresetName);
        if (matchingPreset) {
          selectedPresetId.value = matchingPreset.id;
        }
      });
    }
  }
});

const selectPreset = (presetId: string) => {
  if (selectedPresetId.value === presetId) {
    // 同じペルソナをもう一度タップで解除
    selectedPresetId.value = '';
    editSystemPrompt.value = '';
    editVectorStoreId.value = '';
    return;
  }
  selectedPresetId.value = presetId;
  const preset = getPresetById(presetId);
  if (preset) {
    editSystemPrompt.value = preset.systemPrompt || '';
    editVectorStoreId.value = preset.vectorStoreId || '';
  }
};

const handleSave = () => {
  const selectedPreset = selectedPresetId.value ? getPresetById(selectedPresetId.value) : null;
  const presetName = selectedPreset ? selectedPreset.name : null;
  emit('save', editModel.value, editSystemPrompt.value.trim() || null, editVectorStoreId.value.trim() || null, editUseContext.value, presetName);
  emit('update:modelValue', false);
};
</script>
