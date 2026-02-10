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
      :open="isSidebarOpen"
      :entries="entries"
      :current-entry-id="currentEntryId"
      :is-recording="isRecording"
      :is-transcribing="isTranscribing"
      :recording-duration="recordingDuration"
      @select-entry="handleSelectEntry"
      @delete-entry="handleDeleteEntry"
      @rename-entry="handleRenameEntry"
      @start-recording="handleStartRecording"
      @stop-recording="handleStopRecording"
    />

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col md:ml-0 pb-14 md:pb-0 bg-[#212121]">
      <!-- モバイル用ヘッダー -->
      <MobileHeader
        :title="t('nav.diary')"
        @open-sidebar="isSidebarOpen = true"
      />

      <!-- エントリ未選択時 -->
      <div v-if="!currentEntryId" class="flex-1 flex flex-col items-center justify-center">
        <svg class="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p class="text-gray-600 text-sm">{{ t('diary.empty') }}</p>
      </div>

      <!-- エントリ選択時：詳細表示 -->
      <div v-else-if="currentEntry" class="flex-1 flex flex-col overflow-hidden">
        <!-- ヘッダー -->
        <div class="px-4 py-3 border-b border-gray-800">
          <div class="text-xs text-gray-500">
            {{ formatDate(currentEntry.createdAt) }}
            <span v-if="currentEntry.duration" class="ml-2 text-gray-600">({{ formatDurationShort(currentEntry.duration) }})</span>
          </div>
          <h2 class="font-medium text-sm mt-1">{{ currentEntry.title }}</h2>
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
const { t } = useI18n();
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

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const formatDurationShort = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s}s` : `${s}s`;
};
</script>
