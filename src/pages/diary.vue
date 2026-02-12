<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- アプリナビゲーション -->
    <AppNavigation />

    <!-- モバイル用オーバーレイ -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- サイドバー（録音ボタン + エントリ一覧） -->
    <DiarySidebar
      v-model:open="isSidebarOpen"
      :entries="entries"
      :current-entry-id="currentEntryId"
      :is-recording="isRecording"
      :is-transcribing="isTranscribing"
      :recording-duration="recordingDuration"
      :user-name="currentUser?.name"
      @select-entry="handleSelectEntry"
      @delete-entry="handleDeleteEntry"
      @rename-entry="handleRenameEntry"
      @start-recording="handleStartRecording"
      @stop-recording="handleStopRecording"
      @logout="handleLogout"
      @language-change="handleLanguageChange"
    />

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col md:ml-0 pb-9 md:pb-0 bg-[#212121]">
      <!-- モバイル用ヘッダー -->
      <MobileHeader
        :title="currentEntry?.title"
        :subtitle="currentEntry ? formatDateShort(currentEntry.createdAt) : undefined"
        :has-active-item="!!currentEntryId"
        @open-sidebar="isSidebarOpen = true"
        @rename="handleMobileRename"
        @delete="handleMobileDelete"
      />

      <!-- エントリ未選択時：録音ボタン -->
      <div v-if="!currentEntryId" class="flex-1 flex flex-col items-center justify-center">
        <button
          v-if="!isRecording && !isTranscribing"
          @click="handleStartRecording"
          class="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all flex items-center justify-center shadow-lg"
        >
          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        <button
          v-else-if="isRecording"
          @click="handleStopRecording"
          class="w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-700 active:scale-95 transition-all flex flex-col items-center justify-center shadow-lg animate-pulse"
        >
          <svg class="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span class="text-red-400 text-xs font-mono mt-1">{{ formatDuration(recordingDuration) }}</span>
        </button>
        <div
          v-else-if="isTranscribing"
          class="w-20 h-20 rounded-full bg-gray-800 flex flex-col items-center justify-center shadow-lg"
        >
          <svg class="w-8 h-8 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-blue-400 text-[10px] mt-1">{{ t('diary.transcribing') }}</span>
        </div>
      </div>

      <!-- エントリ選択時：詳細表示 -->
      <div v-else-if="currentEntry" class="flex-1 flex flex-col overflow-hidden">
        <!-- ヘッダー -->
        <div class="px-4 py-3 border-b border-gray-800 hidden md:block">
          <div class="text-xs text-gray-500">
            {{ formatDate(currentEntry.createdAt) }}
            <span v-if="currentEntry.duration" class="ml-2 text-gray-600">({{ formatDurationShort(currentEntry.duration) }})</span>
          </div>
        </div>

        <!-- コンテンツ -->
        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div class="max-w-2xl mx-auto">
            <p class="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{{ currentEntry.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDuration, formatDate, formatDateShort, formatDurationShort } from '~/utils/dateFormat';

const { t } = useI18n();
const { currentUser, handleLogout, handleLanguageChange } = usePageAuth();
const {
  entries,
  currentEntryId,
  currentEntry,
  isRecording,
  isTranscribing,
  recordingDuration,
  loadEntries,
  selectEntry,
  startRecording,
  stopRecording,
  renameEntry,
  deleteEntry,
} = useDiary();

const isSidebarOpen = ref(false);

onMounted(() => {
  loadEntries();
});

const handleSelectEntry = (id: string) => {
  selectEntry(id);
  isSidebarOpen.value = false;
};

const handleStartRecording = async () => {
  try {
    await startRecording();
  } catch (e) {
    alert(t('diary.micPermissionError'));
  }
};

const handleStopRecording = async () => {
  await stopRecording();
};

const handleDeleteEntry = async (id: string) => {
  if (confirm(t('diary.deleteConfirm'))) {
    await deleteEntry(id);
  }
};

const handleRenameEntry = async (id: string, title: string) => {
  await renameEntry(id, title);
};

// モバイルヘッダーメニュー
const handleMobileRename = () => {
  if (!currentEntryId.value) return;
  const entry = entries.value.find(e => e.id === currentEntryId.value);
  const newTitle = prompt(t('menu.renamePrompt'), entry?.title || '');
  if (newTitle?.trim()) {
    handleRenameEntry(currentEntryId.value, newTitle.trim());
  }
};

const handleMobileDelete = () => {
  if (!currentEntryId.value) return;
  handleDeleteEntry(currentEntryId.value);
};

</script>
