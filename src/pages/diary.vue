<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <AppNavigation />
    <div class="flex-1 flex flex-col pb-14 md:pb-0">
      <!-- 録音エリア（上部） -->
      <div class="flex flex-col items-center pt-8 pb-6 border-b border-gray-800">
        <!-- マイクボタン / 停止ボタン -->
        <div v-if="!isRecording && !isTranscribing">
          <button
            @click="handleStartRecording"
            class="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center shadow-lg"
            :title="t('diary.startRecording')"
          >
            <svg class="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
          <p class="text-gray-500 text-sm mt-3 text-center">{{ t('diary.startRecording') }}</p>
        </div>

        <!-- 録音中 -->
        <div v-if="isRecording" class="flex flex-col items-center">
          <button
            @click="handleStopRecording"
            class="w-20 h-20 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center shadow-lg animate-pulse"
            :title="t('diary.stopRecording')"
          >
            <svg class="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
          <p class="text-red-400 text-sm mt-3 font-mono">
            {{ formatDuration(recordingDuration) }}
          </p>
          <p class="text-gray-500 text-xs mt-1">{{ t('diary.stopRecording') }}</p>
        </div>

        <!-- 文字起こし中 -->
        <div v-if="isTranscribing" class="flex flex-col items-center">
          <div class="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <svg class="w-10 h-10 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p class="text-blue-400 text-sm mt-3">{{ t('diary.transcribing') }}</p>
        </div>
      </div>

      <!-- 過去ログ一覧 -->
      <div class="flex-1 overflow-y-auto px-4 py-4">
        <div v-if="entries.length === 0" class="flex items-center justify-center h-full">
          <p class="text-gray-600">{{ t('diary.empty') }}</p>
        </div>

        <div v-else class="max-w-2xl mx-auto space-y-3">
          <div
            v-for="entry in entries"
            :key="entry.id"
            class="bg-gray-800 rounded-lg p-4 group"
          >
            <div class="flex items-start justify-between mb-2">
              <span class="text-xs text-gray-500">
                {{ formatDate(entry.createdAt) }}
                <span v-if="entry.duration" class="ml-2 text-gray-600">
                  ({{ entry.duration }}{{ t('diary.seconds') }})
                </span>
              </span>
              <button
                @click="handleDelete(entry.id)"
                class="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 p-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <p class="text-gray-200 text-sm whitespace-pre-wrap">{{ entry.content }}</p>
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
  isRecording,
  isTranscribing,
  recordingDuration,
  loadEntries,
  startRecording,
  stopRecording,
  deleteEntry,
} = useDiary();

onMounted(() => {
  loadEntries();
});

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

const handleDelete = async (id: string) => {
  if (confirm(t('diary.deleteConfirm'))) {
    await deleteEntry(id);
  }
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
</script>
