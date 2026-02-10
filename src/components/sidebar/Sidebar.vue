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
        @select="emit('selectChat', chat.id)"
        @delete="emit('deleteChat', chat.id)"
        @rename="(name) => emit('renameChat', chat.id, name)"
        @dragstart="(e) => handleDragStart(e, index)"
        @dragover="(e) => handleDragOver(e, index)"
        @dragend="handleDragEnd"
        @drop="(e) => handleDrop(e, index)"
      />
    </div>

    <!-- フッター：歯車アイコン + アカウント名 -->
    <div v-if="userName" class="relative border-t border-gray-800 p-3">
      <button
        @click="isMenuOpen = !isMenuOpen"
        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
      >
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-gray-200 truncate">{{ userName }}</span>
      </button>

      <!-- メニュー（上方向にポップアップ） -->
      <div
        v-if="isMenuOpen"
        class="absolute bottom-full left-3 right-3 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
      >
        <!-- 言語選択 -->
        <div class="px-3 py-2 border-b border-gray-700">
          <div class="text-xs text-gray-400 mb-1">{{ t('language') }}</div>
          <div class="flex gap-1">
            <button
              v-for="option in languageOptions"
              :key="option.value"
              @click="handleLanguageChange(option.value)"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors',
                currentLanguage === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- 文字サイズ（モバイルのみ表示） -->
        <div class="px-3 py-2 border-b border-gray-700 md:hidden">
          <div class="text-xs text-gray-400 mb-1">{{ t('fontSize') }}</div>
          <div class="flex gap-1">
            <button
              v-for="option in fontSizeOptions"
              :key="option.value"
              @click="setFontSize(option.value)"
              :class="[
                'px-2 py-1 text-xs rounded transition-colors',
                currentFontSize === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              {{ t(option.labelKey) }}
            </button>
          </div>
        </div>

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

        <!-- ログアウト -->
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {{ t('logout') }}
        </button>
      </div>

      <!-- クリック外で閉じる用のオーバーレイ -->
      <div
        v-if="isMenuOpen"
        class="fixed inset-0 z-40"
        @click="isMenuOpen = false"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Language } from '~/types';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
}

const props = defineProps<{
  open: boolean;
  chats: Chat[];
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

const { t, currentLanguage, languageOptions, setLanguage, currentFontSize, setFontSize, fontSizeOptions } = useI18n();

const isMenuOpen = ref(false);

const handleLanguageChange = (language: Language) => {
  setLanguage(language);
  emit('languageChange', language);
};

const handleLogout = () => {
  isMenuOpen.value = false;
  emit('logout');
};

const handleOpenPresetManager = () => {
  isMenuOpen.value = false;
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
