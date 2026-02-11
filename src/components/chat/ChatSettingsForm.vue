<template>
  <div class="space-y-4">
    <!-- モデル選択 -->
    <div>
      <label class="text-sm text-gray-400 block mb-2">{{ t('settings.model') }}</label>
      <div v-if="isLoadingModels" class="text-center py-2 text-gray-400 text-sm">
        Loading models...
      </div>
      <select
        v-else
        :value="model"
        @change="emit('update:model', ($event.target as HTMLSelectElement).value)"
        class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option v-for="m in models" :key="m.id" :value="m.id">
          {{ m.name }} ({{ m.contextWindow }})
        </option>
      </select>
    </div>

    <!-- 詳細トグル -->
    <button
      type="button"
      @click="showDetails = !showDetails"
      class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
    >
      {{ showDetails ? t('header.hideDetails') : t('header.showDetails') }}
      <svg class="h-3 w-3 transition-transform" :class="showDetails ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- 詳細セクション -->
    <template v-if="showDetails">
      <!-- AIの性格（システムプロンプト） -->
      <div>
        <label class="text-sm text-gray-400 block mb-2">{{ t('model.systemPrompt') }}</label>
        <textarea
          :value="systemPrompt"
          @input="emit('update:systemPrompt', ($event.target as HTMLTextAreaElement).value)"
          :placeholder="t('settings.systemPrompt.placeholder')"
          rows="6"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
      </div>

      <!-- Vector Store ID入力 -->
      <div>
        <label class="text-sm text-gray-400 block mb-2">{{ t('settings.vectorStoreId.label') }}</label>
        <input
          :value="vectorStoreId"
          @input="emit('update:vectorStoreId', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="t('settings.vectorStoreId.placeholder')"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">{{ t('settings.vectorStoreId.description') }}</p>
      </div>

      <!-- 文脈保持設定 -->
      <div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            :checked="useContext"
            @change="emit('update:useContext', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
            class="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-400">{{ t('settings.useContext') }}</span>
        </label>
        <p class="text-xs text-gray-500 mt-1 ml-8">{{ t('settings.useContext.description') }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';

defineProps<{
  models: Model[];
  model: string;
  systemPrompt: string;
  vectorStoreId: string;
  useContext: boolean;
  isLoadingModels?: boolean;
}>();

const emit = defineEmits<{
  'update:model': [value: string];
  'update:systemPrompt': [value: string];
  'update:vectorStoreId': [value: string];
  'update:useContext': [value: boolean];
}>();

const { t } = useI18n();

const showDetails = ref(false);
</script>
