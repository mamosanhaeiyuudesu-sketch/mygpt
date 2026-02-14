<template>
  <div class="border-b border-gray-800 px-4 py-2 hidden md:flex items-center gap-2">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium bg-gray-800 px-2 py-1 rounded">{{ model }}</span>
      <span v-if="presetName" class="text-sm font-medium bg-gray-800 px-2 py-1 rounded text-blue-400">{{ presetName }}</span>
    </div>
    <!-- 設定編集ボタン -->
    <button
      @click="emit('edit')"
      class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
      :title="t('header.editSettings')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  model: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  presetName?: string | null;
}>();

const emit = defineEmits<{
  edit: [];
}>();

const { t } = useI18n();
</script>
