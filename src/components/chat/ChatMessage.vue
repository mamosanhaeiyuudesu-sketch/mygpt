<template>
  <div class="mb-6">
    <!-- ユーザーメッセージ -->
    <div v-if="message.role === 'user'" class="flex flex-col items-end">
      <div class="bg-zinc-800 rounded-2xl px-3 py-2 md:px-4 md:py-3 max-w-[85%] md:max-w-[80%]">
        <div class="whitespace-pre-wrap text-sm md:text-base">{{ message.content }}</div>
      </div>
      <div class="flex items-center gap-2 mt-1 mr-1">
        <button
          @click="copyToClipboard"
          class="text-zinc-500 hover:text-zinc-300 transition-colors"
          :title="copied ? t('chat.copied') : t('chat.copy')"
        >
          <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <span class="text-xs text-zinc-500">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- アシスタントメッセージ -->
    <div v-else>
      <div class="prose prose-invert prose-sm md:prose-base max-w-2xl" v-html="renderedContent"></div>
      <div class="mt-2">
        <button
          @click="copyToClipboard"
          class="text-zinc-500 hover:text-zinc-300 transition-colors"
          :title="copied ? t('chat.copied') : t('chat.copy')"
        >
          <svg v-if="!copied" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked, type Tokens } from 'marked';

// カスタムrendererを作成（h2の有無に応じてh3の変換を切り替え）
const createRenderer = (hasH2: boolean) => {
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const text = tokens.map((t) => ('text' in t ? t.text : '')).join('');
    let newLevel = depth;
    if (depth === 2) {
      newLevel = 3;
    } else if (depth === 3 && hasH2) {
      newLevel = 4;
    }
    return `<h${newLevel}>${text}</h${newLevel}>`;
  };
  return renderer;
};

marked.use({ breaks: true });

import type { Message } from '~/types';

const props = defineProps<{
  message: Message;
}>();

const { t } = useI18n();

// コピー状態
const copied = ref(false);

// クリップボードにコピー
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy:', e);
  }
};

// 日時フォーマット（例: 2/7 23:11）
const formattedTime = computed(() => {
  if (!props.message.createdAt) return '';
  const date = new Date(props.message.createdAt);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
});

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
  // h2（##）が存在するかチェック
  const hasH2 = /^##\s/m.test(processed);
  const renderer = createRenderer(hasH2);
  return marked.parse(processed, { renderer }) as string;
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
