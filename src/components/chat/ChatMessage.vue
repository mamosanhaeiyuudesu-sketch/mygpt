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
      <div class="prose prose-invert prose-sm md:prose-base max-w-2xl" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked, type Tokens } from 'marked';

// h2をh3に変換するカスタムrenderer
const renderer = new marked.Renderer();
renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
  const text = tokens.map((t) => ('text' in t ? t.text : '')).join('');
  const newLevel = depth === 2 ? 3 : depth;
  return `<h${newLevel}>${text}</h${newLevel}>`;
};

marked.use({ renderer, breaks: true });

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const props = defineProps<{
  message: Message;
}>();

// 読点で改行（行の3割を超えた位置の最初の読点で改行）
const breakAtComma = (line: string): string => {
  const threshold = Math.floor(line.length * 0.3);
  const commaIndex = line.indexOf('、', threshold);
  if (commaIndex === -1) return line;
  return line.slice(0, commaIndex + 1) + '\n' + breakAtComma(line.slice(commaIndex + 1));
};

// 前処理関数
const preprocess = (text: string): string => {
  // **text** を <strong>text</strong> に変換
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 句点の後に改行を追加（既に改行がない場合）
  result = result.replace(/。(?!\n)/g, '。\n');
  // 各行に対して読点での改行処理（見出し行は除く）
  result = result.split('\n').map((line) => {
    if (/^#{1,6}\s/.test(line)) return line;
    return breakAtComma(line);
  }).join('\n');
  return result;
};

const renderedContent = computed(() => {
  const processed = preprocess(props.message.content);
  return marked.parse(processed) as string;
});
</script>

<style scoped>
.prose :deep(hr) {
  margin-top: 1.5em;
  margin-bottom: 1.5em;
}

.prose :deep(h3) {
  margin-bottom: 0.5em;
}

.prose :deep(ul) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
</style>
