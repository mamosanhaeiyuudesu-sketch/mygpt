<template>
  <div class="border-t border-gray-800 p-3 md:p-4">
    <div class="max-w-3xl mx-auto">
      <form @submit.prevent="handleSubmit" class="flex gap-2 md:gap-3 items-end">
        <textarea
          ref="textareaRef"
          v-model="localMessage"
          :placeholder="t('chat.input.placeholder')"
          rows="1"
          class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 md:px-4 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
          :disabled="disabled"
          @keydown="handleKeyDown"
          @input="autoResize"
        ></textarea>
        <button
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
const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  submit: [message: string];
}>();

const { t } = useI18n();

const localMessage = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

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
