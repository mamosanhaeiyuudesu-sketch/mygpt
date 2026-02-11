<template>
  <div
    class="fixed md:relative z-50 h-full w-64 bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- New Chat ボタン -->
    <div class="p-3">
      <button
        @click="emit('newChat')"
        class="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        {{ t('sidebar.newChat') }}
      </button>
    </div>

    <!-- チャット一覧 -->
    <div class="flex-1 overflow-y-auto px-3">
      <ChatListItem
        v-for="(chat, index) in chats"
        :key="chat.id"
        :chat="chat"
        :is-active="chat.id === currentChatId"
        :is-drag-over="dragOverIndex === index"
        :on-generate-title="props.onGenerateTitle"
        @select="emit('selectChat', chat.id); emit('update:open', false)"
        @delete="emit('deleteChat', chat.id)"
        @rename="(name) => emit('renameChat', chat.id, name)"
        @dragstart="(e) => handleDragStart(e, index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragend="handleDragEnd"
        @drop="(e) => handleDrop(e, index)"
      />
    </div>

    <!-- フッター：歯車アイコン + アカウント名 -->
    <SidebarFooterMenu
      :user-name="userName"
      :sidebar-open="open"
      @logout="handleLogout"
      @language-change="(lang) => emit('languageChange', lang)"
    >
      <template #menu-items>
        <!-- プリセット設定 -->
        <button
          @click="handleOpenPresetManager"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          {{ t('presetManager.title') }}
        </button>
      </template>
    </SidebarFooterMenu>
  </div>
</template>

<script setup lang="ts">
import type { Language, ChatPreview } from '~/types';

const props = defineProps<{
  open: boolean;
  chats: ChatPreview[];
  currentChatId: string | null;
  onGenerateTitle?: (chatId: string, excludeTitles?: string[]) => Promise<string | null>;
  userName?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  newChat: [];
  selectChat: [id: string];
  deleteChat: [id: string];
  renameChat: [id: string, name: string];
  reorderChats: [fromIndex: number, toIndex: number];
  logout: [];
  languageChange: [language: Language];
  openPresetManager: [];
}>();

const { t } = useI18n();

const handleLogout = () => {
  emit('logout');
};

const handleOpenPresetManager = () => {
  emit('openPresetManager');
};

// ドラッグ&ドロップ状態
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const handleDragStart = (event: DragEvent, index: number) => {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
};

const handleDragEnd = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
};

const handleDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault();
  if (dragIndex.value !== null && dragIndex.value !== targetIndex) {
    emit('reorderChats', dragIndex.value, targetIndex);
  }
  dragIndex.value = null;
  dragOverIndex.value = null;
};
</script>
