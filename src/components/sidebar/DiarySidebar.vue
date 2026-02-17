<template>
  <div
    class="fixed md:relative z-50 h-full w-56 md:w-64 bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- 新規作成ボタン -->
    <div class="p-3">
      <button
        @click="emit('newEntry'); emit('update:open', false)"
        class="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        {{ t('sidebar.newDiary') }}
      </button>
    </div>

    <!-- エントリ一覧 -->
    <div class="flex-1 overflow-y-auto px-3">
      <DiaryListItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :is-active="entry.id === currentEntryId"
        @select="emit('selectEntry', entry.id); emit('update:open', false)"
        @delete="emit('deleteEntry', entry.id)"
        @rename="(title) => emit('renameEntry', entry.id, title)"
      />
    </div>

    <!-- フッター：歯車アイコン + アカウント名 -->
    <SidebarFooterMenu
      :user-name="userName"
      :sidebar-open="open"
      @logout="emit('logout')"
      @language-change="(lang) => emit('languageChange', lang)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Language, DiaryEntryPreview } from '~/types';

defineProps<{
  open: boolean;
  entries: readonly DiaryEntryPreview[];
  currentEntryId: string | null;
  userName?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  selectEntry: [id: string];
  deleteEntry: [id: string];
  renameEntry: [id: string, title: string];
  newEntry: [];
  logout: [];
  languageChange: [language: Language];
}>();

const { t } = useI18n();
</script>
