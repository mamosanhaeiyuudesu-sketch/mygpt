<template>
  <div class="md:hidden flex items-center py-1 px-2 border-b border-gray-800">
    <button
      @click="emit('openSidebar')"
      class="p-0.5 hover:bg-gray-800 rounded-lg"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <span v-if="title" class="ml-2 text-xs text-gray-300 truncate">{{ title }}</span>
    <span v-if="subtitle" class="ml-1 text-[10px] text-gray-500 shrink-0">{{ subtitle }}</span>
    <span v-if="model" class="ml-2 text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded shrink-0">{{ model }}</span>
    <!-- 設定編集ボタン -->
    <button
      v-if="model"
      @click="emit('edit')"
      class="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
    >
      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    </button>

    <!-- 右端：三点メニュー（アイテム選択時のみ） -->
    <div v-if="hasActiveItem" class="ml-auto relative">
      <button
        @click="isMenuOpen = !isMenuOpen"
        class="p-1 hover:bg-gray-800 rounded-lg"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      </button>

      <!-- ドロップダウンメニュー -->
      <div v-if="isMenuOpen" class="absolute right-0 top-full mt-1 w-40 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-[60]">
        <!-- 名前変更 -->
        <button
          @click="handleRename"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          {{ t('menu.rename') }}
        </button>
        <!-- 削除 -->
        <button
          @click="handleDelete"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          {{ t('menu.delete') }}
        </button>
      </div>

      <!-- メニュー外クリックで閉じる -->
      <div v-if="isMenuOpen" class="fixed inset-0 z-[55]" @click="isMenuOpen = false"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
  model?: string | null;
  hasActiveItem?: boolean;
}>(), {
  title: '',
  subtitle: '',
  hasActiveItem: false,
});

const emit = defineEmits<{
  openSidebar: [];
  edit: [];
  rename: [];
  delete: [];
}>();

const isMenuOpen = ref(false);

const handleRename = () => {
  isMenuOpen.value = false;
  emit('rename');
};

const handleDelete = () => {
  isMenuOpen.value = false;
  emit('delete');
};
</script>
