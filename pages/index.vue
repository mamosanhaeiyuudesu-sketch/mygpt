<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- モバイル用オーバーレイ -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- サイドバー -->
    <div
      class="fixed md:relative z-50 h-full w-64 bg-gray-950 flex flex-col border-r border-gray-800 transition-transform duration-300 md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- New Chat ボタン -->
      <div class="p-3">
        <button
          @click="handleNewChat"
          class="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          New Chat
        </button>
      </div>

      <!-- チャット一覧 -->
      <div class="flex-1 overflow-y-auto px-3">
        <div
          v-for="(chat, index) in chats"
          :key="chat.id"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragover="handleDragOver($event, index)"
          @dragend="handleDragEnd"
          @drop="handleDrop($event, index)"
          @click="handleChatClick(chat.id)"
          @dblclick="startEditing(chat.id)"
          class="group relative mb-1 px-3 py-3 rounded-lg cursor-pointer transition-colors"
          :class="[
            chat.id === currentChatId ? 'bg-gray-800' : 'hover:bg-gray-800',
            dragOverIndex === index ? 'border-t-2 border-blue-500' : ''
          ]"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <!-- 編集モード -->
              <input
                v-if="editingChatId === chat.id"
                ref="editInput"
                v-model="editingName"
                type="text"
                class="w-full bg-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @blur="finishEditing"
                @keyup.enter="finishEditing"
                @keyup.escape="cancelEditing"
                @click.stop
              />
              <!-- 表示モード -->
              <template v-else>
                <div class="font-medium text-sm truncate">{{ chat.name }}</div>
                <div v-if="chat.lastMessage" class="text-xs text-gray-400 truncate mt-1">
                  {{ chat.lastMessage }}
                </div>
              </template>
            </div>

            <!-- アクションボタン（ホバー時に表示） -->
            <div v-if="editingChatId !== chat.id" class="opacity-0 group-hover:opacity-100 flex gap-1 ml-2 transition-opacity">
              <!-- 編集ボタン -->
              <button
                @click.stop="startEditing(chat.id)"
                class="p-1 hover:bg-gray-700 rounded"
                title="名前を変更"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <!-- 削除ボタン -->
              <button
                @click.stop="handleDeleteChat(chat.id)"
                class="p-1 hover:bg-gray-700 rounded"
                title="削除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col md:ml-0">
      <!-- モバイル用ヘッダー -->
      <div class="md:hidden flex items-center p-3 border-b border-gray-800">
        <button
          @click="isSidebarOpen = true"
          class="p-2 hover:bg-gray-800 rounded-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="ml-3 font-semibold">MyGPT</span>
        <span v-if="currentChatModel" class="ml-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{{ currentChatModel }}</span>
      </div>

      <!-- チャット未選択時 -->
      <div v-if="!currentChatId" class="flex-1 flex flex-col">
        <!-- 中央コンテンツ -->
        <div class="flex-1 flex items-center justify-center px-4">
          <div class="text-center">
            <h1 class="text-3xl md:text-4xl font-bold mb-3 md:mb-4">MyGPT</h1>
            <p class="text-gray-400 text-sm md:text-base mb-4">メッセージを入力して会話を始めましょう</p>

            <!-- モデル選択ドロップダウン -->
            <div class="flex items-center justify-center gap-2">
              <label class="text-sm text-gray-400">Model:</label>
              <select
                v-model="selectedModel"
                class="bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                :disabled="isLoadingModels"
              >
                <option v-if="isLoadingModels" value="">Loading...</option>
                <option v-for="model in availableModels" :key="model.id" :value="model.id">
                  {{ model.name }} ({{ model.contextWindow }})
                </option>
              </select>
            </div>
            <p v-if="selectedModelInfo" class="text-xs text-gray-500 mt-2">
              {{ selectedModelInfo.description }}
            </p>
          </div>
        </div>

        <!-- 入力欄（ホーム画面用） -->
        <div class="border-t border-gray-800 p-3 md:p-4">
          <div class="max-w-3xl mx-auto">
            <form @submit.prevent="handleNewChatWithMessage" class="flex gap-2 md:gap-3 items-end">
              <textarea
                v-model="inputMessage"
                placeholder="メッセージを入力..."
                rows="1"
                class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 md:px-4 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
                :disabled="isLoading"
                @keydown="handleKeyDown($event, handleNewChatWithMessage)"
                @input="autoResize"
              ></textarea>
              <button
                type="submit"
                :disabled="!inputMessage.trim() || isLoading || !selectedModel"
                class="px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- チャット選択時 -->
      <template v-else>
        <!-- チャットヘッダー（モデル表示） -->
        <div class="border-b border-gray-800 px-4 py-2 hidden md:flex items-center gap-2">
          <span class="text-sm text-gray-400">Model:</span>
          <span class="text-sm font-medium bg-gray-800 px-2 py-1 rounded">{{ currentChatModel }}</span>
        </div>

        <!-- メッセージ一覧 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8">
            <div
              v-for="message in messages"
              :key="message.id"
              class="mb-6"
            >
              <!-- ユーザーメッセージ -->
              <div v-if="message.role === 'user'" class="flex justify-end">
                <div class="bg-blue-600 rounded-2xl px-3 py-2 md:px-4 md:py-3 max-w-[85%] md:max-w-[80%]">
                  <div class="whitespace-pre-wrap text-sm md:text-base">{{ message.content }}</div>
                </div>
              </div>

              <!-- アシスタントメッセージ -->
              <div v-else class="flex justify-start">
                <div class="bg-gray-800 rounded-2xl px-3 py-2 md:px-4 md:py-3 max-w-[85%] md:max-w-[80%]">
                  <div class="prose prose-invert prose-sm md:prose-base max-w-none" v-html="renderMarkdown(message.content)"></div>
                </div>
              </div>
            </div>

            <!-- ローディング表示 -->
            <div v-if="isLoading" class="mb-6 flex justify-start">
              <div class="bg-gray-800 rounded-2xl px-4 py-3">
                <div class="flex gap-1">
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 入力欄 -->
        <div class="border-t border-gray-800 p-3 md:p-4">
          <div class="max-w-3xl mx-auto">
            <form @submit.prevent="handleSendMessage" class="flex gap-2 md:gap-3 items-end">
              <textarea
                v-model="inputMessage"
                placeholder="メッセージを入力..."
                rows="1"
                class="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 md:px-4 md:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32 overflow-y-auto"
                :disabled="isLoading"
                @keydown="handleKeyDown($event, handleSendMessage)"
                @input="autoResize"
              ></textarea>
              <button
                type="submit"
                :disabled="!inputMessage.trim() || isLoading"
                class="px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </template>
    </div>

    <!-- モデル選択ダイアログ -->
    <div
      v-if="showModelSelector"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="showModelSelector = false"
    >
      <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
        <h2 class="text-lg font-bold mb-4">モデルを選択</h2>
        <p class="text-sm text-gray-400 mb-4">新しいチャットで使用するモデルを選択してください。</p>

        <div class="max-h-64 overflow-y-auto mb-4">
          <div v-if="isLoadingModels" class="text-center py-4 text-gray-400">
            Loading models...
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="model in availableModels"
              :key="model.id"
              @click="handleCreateChatWithModel(model.id)"
              class="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors border border-gray-700"
            >
              <div class="flex justify-between items-center">
                <span class="font-medium">{{ model.name }}</span>
                <span class="text-xs text-gray-500">{{ model.contextWindow }}</span>
              </div>
              <div class="text-xs text-gray-400 mt-1">{{ model.description }}</div>
              <div class="text-xs text-gray-500 mt-1">{{ model.inputPrice }} / {{ model.outputPrice }}</div>
            </button>
          </div>
        </div>

        <button
          @click="showModelSelector = false"
          class="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked';

// marked の設定
marked.setOptions({
  breaks: true, // 改行を <br> に変換
  gfm: true     // GitHub Flavored Markdown
});

const {
  chats,
  currentChatId,
  currentChatModel,
  messages,
  isLoading,
  fetchChats,
  createChat,
  selectChat,
  sendMessage,
  deleteChat,
  renameChat,
  reorderChats
} = useChat();

// モデル関連
interface Model {
  id: string;
  name: string;
  inputPrice: string;
  outputPrice: string;
  contextWindow: string;
  description: string;
}
const availableModels = ref<Model[]>([]);
const selectedModel = ref<string>('gpt-4o-mini');
const isLoadingModels = ref(false);
const showModelSelector = ref(false);

// 選択中のモデル情報
const selectedModelInfo = computed(() => {
  return availableModels.value.find(m => m.id === selectedModel.value);
});

/**
 * OpenAI のモデル一覧を取得
 */
const fetchModels = async () => {
  try {
    isLoadingModels.value = true;
    const response = await fetch('/api/models');
    if (response.ok) {
      const data = await response.json() as { models: Model[] };
      availableModels.value = data.models;
      // デフォルトでgpt-4o-miniを選択（存在する場合）
      if (data.models.some(m => m.id === 'gpt-4o-mini')) {
        selectedModel.value = 'gpt-4o-mini';
      } else if (data.models.length > 0) {
        selectedModel.value = data.models[0].id;
      }
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
  } finally {
    isLoadingModels.value = false;
  }
};

// 入力メッセージ
const inputMessage = ref('');

// メッセージコンテナ（自動スクロール用）
const messagesContainer = ref<HTMLElement | null>(null);

// 編集状態
const editingChatId = ref<string | null>(null);
const editingName = ref('');
const editInput = ref<HTMLInputElement | null>(null);

// ドラッグ&ドロップ状態
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// モバイル用サイドバー状態
const isSidebarOpen = ref(false);

/**
 * マークダウンをHTMLに変換
 */
const renderMarkdown = (content: string): string => {
  return marked.parse(content) as string;
};

/**
 * キーダウンハンドラ（Enter で送信、Shift+Enter で改行）
 * IME変換中は送信しない
 */
const handleKeyDown = (event: KeyboardEvent, submitFn: () => void) => {
  // IME変換中は無視
  if (event.isComposing) {
    return;
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (inputMessage.value.trim() && !isLoading.value) {
      submitFn();
    }
  }
};

/**
 * テキストエリアの高さを自動調整
 */
const autoResize = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
};

/**
 * 全テキストエリアの高さをリセット
 */
const resetTextareaHeight = () => {
  nextTick(() => {
    document.querySelectorAll('textarea').forEach(textarea => {
      textarea.style.height = 'auto';
    });
  });
};

// 初期化: チャット一覧とモデル一覧を取得
onMounted(async () => {
  await Promise.all([fetchChats(), fetchModels()]);
});

// 自動スクロールは無効（ユーザーは上から読むため）

/**
 * チャットをクリック（編集中でなければ選択）
 */
const handleChatClick = (chatId: string) => {
  if (editingChatId.value !== chatId) {
    selectChat(chatId);
    // モバイルではサイドバーを閉じる
    isSidebarOpen.value = false;
  }
};

/**
 * 編集モードを開始
 */
const startEditing = (chatId: string) => {
  const chat = chats.value.find(c => c.id === chatId);
  if (chat) {
    editingChatId.value = chatId;
    editingName.value = chat.name;
    nextTick(() => {
      if (editInput.value) {
        (editInput.value as HTMLInputElement).focus();
        (editInput.value as HTMLInputElement).select();
      }
    });
  }
};

/**
 * 編集を完了
 */
const finishEditing = async () => {
  if (editingChatId.value && editingName.value.trim()) {
    try {
      await renameChat(editingChatId.value, editingName.value.trim());
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  }
  editingChatId.value = null;
  editingName.value = '';
};

/**
 * 編集をキャンセル
 */
const cancelEditing = () => {
  editingChatId.value = null;
  editingName.value = '';
};

/**
 * ドラッグ開始
 */
const handleDragStart = (event: DragEvent, index: number) => {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

/**
 * ドラッグオーバー
 */
const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
};

/**
 * ドラッグ終了
 */
const handleDragEnd = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
};

/**
 * ドロップ
 */
const handleDrop = async (event: DragEvent, targetIndex: number) => {
  event.preventDefault();
  if (dragIndex.value !== null && dragIndex.value !== targetIndex) {
    try {
      await reorderChats(dragIndex.value, targetIndex);
    } catch (error) {
      console.error('Failed to reorder chats:', error);
    }
  }
  dragIndex.value = null;
  dragOverIndex.value = null;
};

/**
 * 新しいチャットを作成（モデル選択ダイアログを表示）
 */
const handleNewChat = () => {
  showModelSelector.value = true;
};

/**
 * モデルを選択してチャットを作成
 */
const handleCreateChatWithModel = async (modelId: string) => {
  try {
    showModelSelector.value = false;
    await createChat(modelId);
    // モバイルではサイドバーを閉じる
    isSidebarOpen.value = false;
  } catch (error) {
    console.error('Failed to create chat:', error);
    alert('チャットの作成に失敗しました');
  }
};

/**
 * 新しいチャットを作成してメッセージを送信（ホーム画面用）
 */
const handleNewChatWithMessage = async () => {
  const message = inputMessage.value.trim();
  if (!message || isLoading.value || !selectedModel.value) {
    return;
  }

  try {
    // 入力欄をクリア
    inputMessage.value = '';
    resetTextareaHeight();

    // 新しいチャットを作成（選択されたモデルで）
    await createChat(selectedModel.value);

    // メッセージを送信
    await sendMessage(message);
  } catch (error) {
    console.error('Failed to create chat with message:', error);
    alert('チャットの作成に失敗しました');
    // エラー時は入力を復元
    inputMessage.value = message;
  }
};

/**
 * チャットを削除
 */
const handleDeleteChat = async (chatId: string) => {
  if (!confirm('このチャットを削除しますか?')) {
    return;
  }

  try {
    await deleteChat(chatId);
  } catch (error) {
    console.error('Failed to delete chat:', error);
    alert('チャットの削除に失敗しました');
  }
};

/**
 * メッセージを送信
 */
const handleSendMessage = async () => {
  const message = inputMessage.value.trim();
  if (!message || isLoading.value) {
    return;
  }

  try {
    // 入力欄をクリア
    inputMessage.value = '';
    resetTextareaHeight();

    // メッセージ送信
    await sendMessage(message);
  } catch (error) {
    console.error('Failed to send message:', error);
    alert('メッセージの送信に失敗しました');
    // エラー時は入力を復元
    inputMessage.value = message;
  }
};
</script>
