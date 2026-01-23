<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- サイドバー -->
    <div class="w-64 bg-gray-950 flex flex-col border-r border-gray-800">
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
          v-for="chat in chats"
          :key="chat.id"
          @click="selectChat(chat.id)"
          class="group relative mb-1 px-3 py-3 rounded-lg cursor-pointer transition-colors"
          :class="chat.id === currentChatId ? 'bg-gray-800' : 'hover:bg-gray-800'"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ chat.name }}</div>
              <div v-if="chat.lastMessage" class="text-xs text-gray-400 truncate mt-1">
                {{ chat.lastMessage }}
              </div>
            </div>

            <!-- 削除ボタン（ホバー時に表示） -->
            <button
              @click.stop="handleDeleteChat(chat.id)"
              class="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-gray-700 rounded transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col">
      <!-- チャット未選択時 -->
      <div v-if="!currentChatId" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-4xl font-bold mb-4">MyGPT</h1>
          <p class="text-gray-400">新しいチャットを開始するか、既存のチャットを選択してください</p>
        </div>
      </div>

      <!-- チャット選択時 -->
      <template v-else>
        <!-- メッセージ一覧 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-4 py-8">
            <div
              v-for="message in messages"
              :key="message.id"
              class="mb-6"
            >
              <!-- ユーザーメッセージ -->
              <div v-if="message.role === 'user'" class="flex justify-end">
                <div class="bg-blue-600 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div class="whitespace-pre-wrap">{{ message.content }}</div>
                </div>
              </div>

              <!-- アシスタントメッセージ -->
              <div v-else class="flex justify-start">
                <div class="bg-gray-800 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div class="whitespace-pre-wrap">{{ message.content }}</div>
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
        <div class="border-t border-gray-800 p-4">
          <div class="max-w-3xl mx-auto">
            <form @submit.prevent="handleSendMessage" class="flex gap-3">
              <input
                v-model="inputMessage"
                type="text"
                placeholder="メッセージを入力..."
                class="flex-1 bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :disabled="isLoading"
              />
              <button
                type="submit"
                :disabled="!inputMessage.trim() || isLoading"
                class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  chats,
  currentChatId,
  messages,
  isLoading,
  fetchChats,
  createChat,
  selectChat,
  sendMessage,
  deleteChat
} = useChat();

// 入力メッセージ
const inputMessage = ref('');

// メッセージコンテナ（自動スクロール用）
const messagesContainer = ref<HTMLElement | null>(null);

// 初期化: チャット一覧を取得
onMounted(async () => {
  await fetchChats();
});

// メッセージが追加されたら自動スクロール
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}, { deep: true });

/**
 * 新しいチャットを作成
 */
const handleNewChat = async () => {
  try {
    await createChat();
  } catch (error) {
    console.error('Failed to create chat:', error);
    alert('チャットの作成に失敗しました');
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
