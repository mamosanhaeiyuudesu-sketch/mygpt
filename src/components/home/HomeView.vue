<template>
  <div class="flex-1 flex flex-col">
    <!-- 中央コンテンツ -->
    <div class="flex-1 flex items-center justify-center px-4">
      <div class="w-full max-w-md">
        <!-- ヘッダー：タイトル + プリセット選択 -->
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl md:text-3xl font-bold">{{ t('sidebar.newChat') }}</h1>
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
          v-model:model="localSelectedModel"
          v-model:system-prompt="localSystemPrompt"
          v-model:vector-store-id="localVectorStoreId"
          v-model:use-context="localUseContext"
          :is-loading-models="isLoadingModels"
        />
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
  submit: [message: string, model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean];
}>();

const { t } = useI18n();
const { presets, loadPresets, getPresetById } = usePresets();

const localSystemPrompt = ref('');
const localVectorStoreId = ref('');
const localUseContext = ref(true);
const selectedPresetId = ref('');

const localSelectedModel = computed({
  get: () => props.selectedModel,
  set: (value) => emit('update:selectedModel', value)
});

// 初期表示時にプリセットを読み込む
onMounted(() => {
  loadPresets();
});

const handlePresetChange = () => {
  if (!selectedPresetId.value) {
    emit('update:selectedModel', props.models.length > 0 ? props.models[0].id : 'gpt-4o');
    localSystemPrompt.value = '';
    localVectorStoreId.value = '';
    localUseContext.value = true;
    return;
  }
  const preset = getPresetById(selectedPresetId.value);
  if (preset) {
    emit('update:selectedModel', preset.model);
    localSystemPrompt.value = preset.systemPrompt || '';
    localVectorStoreId.value = preset.vectorStoreId || '';
    localUseContext.value = preset.useContext;
  }
};

const handleSubmit = (message: string) => {
  emit('submit', message, props.selectedModel, localSystemPrompt.value.trim() || undefined, localVectorStoreId.value.trim() || undefined, localUseContext.value);
};
</script>
