<template>
  <div class="border-b border-gray-800 px-4 py-2 hidden md:flex items-center gap-2">
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-400">Model:</span>
      <span class="text-sm font-medium bg-gray-800 px-2 py-1 rounded">{{ model }}</span>
    </div>
    <div v-if="systemPrompt" class="flex items-center gap-1 text-sm text-gray-400" title="カスタムシステムプロンプト設定済み">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>
      <span class="truncate max-w-32">{{ systemPrompt.substring(0, 20) }}...</span>
    </div>
    <div v-if="vectorStoreId" class="flex items-center gap-1 text-sm text-green-400" title="RAG有効（Vector Store）">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
      <span>RAG</span>
    </div>
    <div v-if="!useContext" class="flex items-center gap-1 text-sm text-yellow-400" title="文脈なし（高速モード）">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
      </svg>
      <span>高速</span>
    </div>
    <!-- 設定編集ボタン -->
    <button
      @click="emit('edit')"
      class="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
      title="設定を編集"
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
  useContext?: boolean;
}>();

const emit = defineEmits<{
  edit: [];
}>();
</script>
