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

// 段落内で2行以上続く場合、句点で空白行を入れる
const addParagraphBreaks = (text: string): string => {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map(paragraph => {
    // 見出しやリストはスキップ
    if (/^#{1,6}\s/.test(paragraph) || /^[-*]\s/.test(paragraph)) {
      return paragraph;
    }
    const lines = paragraph.split('\n');
    if (lines.length < 2) return paragraph;
    // 句点の後に空白行を入れる
    return paragraph.replace(/。\n(?!\n)/g, '。\n\n');
  }).join('\n\n');
};

// 前処理関数
const preprocess = (text: string): string => {
  // **text** を <strong>text</strong> に変換
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 各行に対して句点・読点での改行処理（見出し行・リスト項目は除く）
  result = result.split('\n').map((line) => {
    if (/^#{1,6}\s/.test(line) || /^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) return line;
    // 句点の後に改行を追加
    let processed = line.replace(/。(?!\n)/g, '。\n');
    // 読点での改行処理（句点で分割した各行に適用）
    return processed.split('\n').map(l => breakAtComma(l)).join('\n');
  }).join('\n');
  // 2行以上続く段落で句点の後に空白行を入れる
  result = addParagraphBreaks(result);
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
  margin-bottom: 0.6em;
}

.prose :deep(ul) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}
</style>
