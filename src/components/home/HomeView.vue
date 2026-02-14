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
        <div v-if="presets.length > 0">
          <label class="text-sm text-gray-400 block mb-2">{{ t('settings.preset') }}</label>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              v-for="preset in presets"
              :key="preset.id"
              @click="selectPreset(preset.id)"
              :class="[
                'rounded border p-2 text-left transition-colors',
                selectedPresetId === preset.id
                  ? 'bg-blue-600/20 border-blue-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-500'
              ]"
            >
              <div class="flex items-center gap-1.5">
                <div class="shrink-0">
                  <img
                    v-if="preset.imageUrl"
                    :src="preset.imageUrl"
                    :alt="preset.name"
                    class="w-8 h-8 rounded object-cover"
                  />
                  <div
                    v-else
                    class="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-500"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">{{ preset.name }}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- 文脈保持設定 -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm text-gray-400">{{ t('settings.useContext') }}</label>
            <p class="text-xs text-gray-500 mt-0.5">{{ t('settings.useContext.description') }}</p>
          </div>
          <button
            type="button"
            @click="localUseContext = !localUseContext"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              localUseContext ? 'bg-blue-600' : 'bg-gray-600'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                localUseContext ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
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
