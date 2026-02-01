<template>
  <div class="mb-6">
    <!-- ユーザーメッセージ -->
    <div v-if="message.role === 'user'" class="flex justify-end">
      <div class="bg-zinc-800 rounded-2xl px-3 py-2 md:px-4 md:py-3 max-w-[85%] md:max-w-[80%]">
        <div class="whitespace-pre-wrap text-sm md:text-base">{{ message.content }}</div>
      </div>
    </div>

    <!-- アシスタントメッセージ -->
    <div v-else>
      <div class="prose prose-invert prose-sm md:prose-base max-w-none" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const props = defineProps<{
  message: Message;
}>();

const renderedContent = computed(() => {
  return marked.parse(props.message.content) as string;
});
</script>
