<template>
  <div
    class="fixed md:relative z-50 h-full w-64 bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- 録音ボタン -->
    <div class="p-3">
      <!-- 待機中：マイクボタン -->
      <button
        v-if="!isRecording && !isTranscribing"
        @click="emit('startRecording')"
        class="w-full px-4 py-3 bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
        {{ t('diary.startRecording') }}
      </button>
      <!-- 録音中：停止ボタン + 時間 -->
      <button
        v-else-if="isRecording"
        @click="emit('stopRecording')"
        class="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 animate-pulse"
      >
        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
        <span class="text-red-400 font-mono">{{ formatDuration(recordingDuration) }}</span>
      </button>
      <!-- 文字起こし中 -->
      <div
        v-else-if="isTranscribing"
        class="w-full px-4 py-3 bg-gray-800 rounded-lg flex items-center justify-center gap-2"
      >
        <svg class="w-5 h-5 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-blue-400 text-sm">{{ t('diary.transcribing') }}</span>
      </div>
    </div>

    <!-- エントリ一覧 -->
    <div class="flex-1 overflow-y-auto px-3">
      <DiaryListItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :is-active="entry.id === currentEntryId"
        @select="emit('selectEntry', entry.id)"
        @delete="emit('deleteEntry', entry.id)"
        @rename="(title) => emit('renameEntry', entry.id, title)"
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

interface Entry {
  id: string;
  title: string;
  duration?: number;
  createdAt: number;
}

defineProps<{
  open: boolean;
  entries: readonly Entry[];
  currentEntryId: string | null;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  userName?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  selectEntry: [id: string];
  deleteEntry: [id: string];
  renameEntry: [id: string, title: string];
  startRecording: [];
  stopRecording: [];
  logout: [];
  languageChange: [language: Language];
}>();

const { t, currentLanguage, languageOptions, setLanguage } = useI18n();

const isMenuOpen = ref(false);

const handleLanguageChange = (language: Language) => {
  setLanguage(language);
  emit('languageChange', language);
};

const handleLogout = () => {
  isMenuOpen.value = false;
  emit('logout');
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
</script>
