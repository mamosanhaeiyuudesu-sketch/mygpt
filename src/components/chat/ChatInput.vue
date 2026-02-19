<template>
  <div class="border-t border-gray-800 p-3 md:p-4">
    <div class="max-w-3xl mx-auto">
      <form @submit.prevent="handleSubmit" class="flex gap-2 md:gap-3 items-end">
        <div class="relative flex-1">
          <!-- 録音ボタン（テキストエリア左上） -->
          <div class="absolute top-2 left-2 z-10">
            <button
              v-if="!isRecording && !isTranscribing"
              type="button"
              @click="handleStartRecording"
              class="p-1 rounded hover:bg-gray-700 transition-colors"
              :title="t('diary.startRecording')"
              :disabled="disabled"
            >
              <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
            <button
              v-else-if="isRecording"
              type="button"
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
            v-model="localMessage"
            :placeholder="t('chat.input.placeholder')"
            rows="1"
            class="w-full bg-gray-800 text-white rounded-lg pl-10 pr-3 py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
            :disabled="disabled"
            @keydown="handleKeyDown"
            @input="autoResize"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
          ></textarea>
        </div>
        <!-- 停止ボタン（ストリーミング中） -->
        <button
          v-if="isLoading"
          type="button"
          @click="emit('stop')"
          class="px-4 py-2 md:px-6 md:py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors shrink-0"
        >
          {{ t('chat.input.stop') }}
        </button>
        <!-- 送信ボタン（通常時） -->
        <button
          v-else
          type="submit"
          :disabled="!localMessage.trim() || disabled"
          class="px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
        >
          {{ t('chat.input.send') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDuration } from '~/utils/dateFormat';
import { useVoiceRecording } from '~/composables/useVoiceRecording';

const props = defineProps<{
  disabled?: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  submit: [message: string];
  stop: [];
}>();

const { t } = useI18n();
const { isRecording, isTranscribing, recordingDuration, startRecording, stopRecording } = useVoiceRecording();

const isInputFocused = useState('inputFocused', () => false);
const localMessage = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const handleStartRecording = async () => {
  try {
    await startRecording();
  } catch (e) {
    alert(t('diary.micPermissionError'));
  }
};

const handleStopRecording = async () => {
  await stopRecording(localMessage);
};

const handleSubmit = () => {
  const message = localMessage.value.trim();
  if (!message || props.disabled) return;

  emit('submit', message);
  localMessage.value = '';
  resetTextareaHeight();
};

const handleKeyDown = (event: KeyboardEvent) => {
  // IME変換中は無視
  if (event.isComposing) return;

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};

const autoResize = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const resetTextareaHeight = () => {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
    }
  });
};
</script>
