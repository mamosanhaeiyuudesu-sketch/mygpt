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
  </div>
</template>

<script setup lang="ts">
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
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  selectEntry: [id: string];
  deleteEntry: [id: string];
  renameEntry: [id: string, title: string];
  startRecording: [];
  stopRecording: [];
}>();

const { t } = useI18n();

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
</script>
