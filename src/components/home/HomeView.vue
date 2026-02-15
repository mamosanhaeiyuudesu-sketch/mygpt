<template>
  <div class="flex-1 flex flex-col">
    <!-- 中央コンテンツ -->
    <div class="flex-1 flex items-start pt-[5vh] md:items-center md:pt-0 justify-center px-4">
      <div class="w-full max-w-md space-y-4">
        <h1 class="text-2xl md:text-3xl font-bold">{{ t('sidebar.newChat') }}</h1>

        <!-- モデル選択 -->
        <div>
          <label class="text-sm text-gray-400 block mb-2">{{ t('settings.model') }}</label>
          <div v-if="isLoadingModels" class="text-center py-2 text-gray-400 text-sm">
            Loading models...
          </div>
          <select
            v-else
            :value="selectedModel"
            @change="emit('update:selectedModel', ($event.target as HTMLSelectElement).value)"
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
          <ToggleSwitch v-model="localUseContext" />
        </div>
      </div>
    </div>

    <!-- 入力欄 -->
    <ChatInput :disabled="isLoading" @submit="handleSubmit" />
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { usePresets } from '~/composables/usePresets';

const props = defineProps<{
  models: Model[];
  selectedModel: string;
  isLoadingModels?: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  'update:selectedModel': [value: string];
  submit: [message: string, model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean, presetName?: string];
}>();

const { t } = useI18n();
const { presets, loadPresets, getPresetById } = usePresets();

const localSystemPrompt = ref('');
const localVectorStoreId = ref('');
const localUseContext = ref(true);
const selectedPresetId = ref('');

// 初期表示時にプリセットを読み込む
onMounted(() => {
  loadPresets();
});

const selectPreset = (presetId: string) => {
  if (selectedPresetId.value === presetId) {
    // 同じペルソナをもう一度タップで解除
    selectedPresetId.value = '';
    localSystemPrompt.value = '';
    localVectorStoreId.value = '';
    return;
  }
  selectedPresetId.value = presetId;
  const preset = getPresetById(presetId);
  if (preset) {
    localSystemPrompt.value = preset.systemPrompt || '';
    localVectorStoreId.value = preset.vectorStoreId || '';
  }
};

const handleSubmit = (message: string) => {
  const selectedPreset = selectedPresetId.value ? getPresetById(selectedPresetId.value) : null;
  const presetName = selectedPreset ? selectedPreset.name : undefined;
  emit('submit', message, props.selectedModel, localSystemPrompt.value.trim() || undefined, localVectorStoreId.value.trim() || undefined, localUseContext.value, presetName);
};
</script>
