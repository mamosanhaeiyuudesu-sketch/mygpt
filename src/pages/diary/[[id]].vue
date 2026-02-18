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

    <!-- サイドバー -->
    <DiarySidebar
      v-model:open="isSidebarOpen"
      :entries="entries"
      :current-entry-id="currentEntryId"
      :user-name="currentUser?.name"
      @select-entry="handleSelectEntry"
      @delete-entry="handleDeleteEntry"
      @rename-entry="handleRenameEntry"
      @new-entry="handleNewEntry"
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
      <!-- デスクトップ用ヘッダー -->
      <div class="border-b border-gray-800 px-4 py-2 hidden md:block"></div>

      <!-- エントリ未選択時：新規作成画面（HomeView風） -->
      <div v-if="!currentEntryId" class="flex-1 flex flex-col">
        <div class="flex-1 flex items-start pt-[5vh] md:items-center md:pt-0 justify-center px-4">
          <div class="w-full max-w-[810px] space-y-4">
            <h1 class="text-2xl md:text-3xl font-bold">{{ t('sidebar.newDiary') }}</h1>

            <!-- 入力フォーム -->
            <div class="relative">
              <!-- 録音アイコン（フォーム内左上） -->
              <div class="absolute top-2 left-2 z-10">
                <button
                  v-if="!isRecording && !isTranscribing"
                  @click="handleStartRecording"
                  class="p-1 rounded hover:bg-gray-700 transition-colors"
                  :title="t('diary.startRecording')"
                >
                  <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
                <button
                  v-else-if="isRecording"
                  @click="handleStopRecording"
                  class="flex items-center gap-1 px-1.5 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors animate-pulse"
                >
                  <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span class="text-red-400 text-xs font-mono">{{ formatDuration(recordingDuration) }}</span>
                </button>
                <div
                  v-else-if="isTranscribing"
                  class="flex items-center gap-1 px-1.5 py-1 rounded bg-gray-700"
                >
                  <svg class="w-4 h-4 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span class="text-blue-400 text-xs">{{ t('diary.transcribing') }}</span>
                </div>
              </div>
              <textarea
                ref="textareaRef"
                v-model="editingContent"
                class="w-full h-48 bg-gray-800 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 leading-relaxed"
                :placeholder="t('chat.input.placeholder')"
              ></textarea>
            </div>

            <!-- 完了ボタン -->
            <div class="flex justify-end">
              <button
                @click="handleSave"
                :disabled="!editingContent.trim()"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors text-sm font-medium"
              >
                {{ t('diary.complete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- エントリ選択時：セクション表示 + 追記フォーム -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div class="max-w-[810px] mx-auto">
            <!-- 保存済みセクション一覧 -->
            <div
              v-for="(section, index) in currentSections"
              :key="index"
              class="mb-4"
            >
              <p class="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{{ section.text }}</p>
              <div v-if="section.completedAt" class="flex justify-end mt-1">
                <span class="text-gray-500 text-xs">{{ formatDateShort(section.completedAt) }}</span>
              </div>
            </div>

            <!-- 追記フォーム -->
            <div class="mt-2">
              <div class="relative">
                <!-- 録音アイコン（フォーム内左上） -->
                <div class="absolute top-2 left-2 z-10">
                  <button
                    v-if="!isRecording && !isTranscribing"
                    @click="handleStartRecording"
                    class="p-1 rounded hover:bg-gray-700 transition-colors"
                    :title="t('diary.startRecording')"
                  >
                    <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  </button>
                  <button
                    v-else-if="isRecording"
                    @click="handleStopRecording"
                    class="flex items-center gap-1 px-1.5 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors animate-pulse"
                  >
                    <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    <span class="text-red-400 text-xs font-mono">{{ formatDuration(recordingDuration) }}</span>
                  </button>
                  <div
                    v-else-if="isTranscribing"
                    class="flex items-center gap-1 px-1.5 py-1 rounded bg-gray-700"
                  >
                    <svg class="w-4 h-4 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span class="text-blue-400 text-xs">{{ t('diary.transcribing') }}</span>
                  </div>
                </div>
                <textarea
                  ref="textareaRef"
                  v-model="editingContent"
                  class="w-full h-48 bg-gray-800 text-gray-200 text-sm rounded-lg pl-10 pr-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 leading-relaxed"
                  :placeholder="t('chat.input.placeholder')"
                ></textarea>
              </div>

              <!-- 完了ボタン -->
              <div class="flex justify-end mt-3">
                <button
                  @click="handleSave"
                  :disabled="!editingContent.trim()"
                  class="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors text-sm font-medium"
                >
                  {{ t('diary.complete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDuration, formatDateShort } from '~/utils/dateFormat';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { currentUser, handleLogout, handleLanguageChange } = usePageAuth();
const {
  entries,
  currentEntryId,
  currentEntry,
  currentSections,
  isRecording,
  isTranscribing,
  recordingDuration,
  isEditing,
  editingContent,
  loadEntries,
  selectEntry,
  startNewEntry,
  startRecording,
  stopRecording,
  saveEditingEntry,
  renameEntry,
  deleteEntry,
} = useDiary();

const lastDiaryId = useState<string | null>('lastDiaryId', () => null);
const isSidebarOpen = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

onMounted(async () => {
  await loadEntries();
  // ルートパラメータからエントリを選択
  const entryId = route.params.id as string | undefined;
  if (entryId) {
    if (entries.value.some(e => e.id === entryId)) {
      selectEntry(entryId);
      lastDiaryId.value = entryId;
    } else {
      router.replace('/diary');
    }
  } else {
    // 未選択時は新規作成モードを開始
    startNewEntry();
  }
});

const handleSelectEntry = (id: string) => {
  selectEntry(id);
  lastDiaryId.value = id;
  router.push(`/diary/${id}`);
  isSidebarOpen.value = false;
};

const handleNewEntry = () => {
  startNewEntry();
  router.push('/diary');
  isSidebarOpen.value = false;
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

const handleStartRecording = async () => {
  // 新規作成モードでなければ開始
  if (!isEditing.value) {
    startNewEntry();
  }
  try {
    await startRecording();
  } catch (e) {
    alert(t('diary.micPermissionError'));
  }
};

const handleStopRecording = async () => {
  await stopRecording();
};

const handleSave = async () => {
  await saveEditingEntry();
  nextTick(() => {
    textareaRef.value?.focus();
  });
};

const handleDeleteEntry = async (id: string) => {
  if (confirm(t('diary.deleteConfirm'))) {
    const wasCurrent = currentEntryId.value === id;
    await deleteEntry(id);
    if (wasCurrent) {
      startNewEntry();
      router.push('/diary');
    }
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
