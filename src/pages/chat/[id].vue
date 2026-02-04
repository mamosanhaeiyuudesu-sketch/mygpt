<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- モバイル用オーバーレイ -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- サイドバー -->
    <Sidebar
      :open="isSidebarOpen"
      :chats="chats"
      :current-chat-id="currentChatId"
      :on-generate-title="handleGenerateTitle"
      @new-chat="handleNewChat"
      @select-chat="handleSelectChat"
      @delete-chat="handleDeleteChat"
      @rename-chat="handleRenameChat"
      @reorder-chats="handleReorderChats"
    />

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col md:ml-0 bg-[#212121]">
      <!-- モバイル用ヘッダー -->
      <MobileHeader
        :model="currentChatModel"
        @open-sidebar="isSidebarOpen = true"
      />

      <!-- チャット未選択時 -->
      <HomeView
        v-if="!currentChatId"
        v-model:selected-model="selectedModel"
        :models="availableModels"
        :is-loading-models="isLoadingModels"
        :is-loading="isLoading"
        @submit="handleNewChatWithMessage"
      />

      <!-- チャット選択時 -->
      <template v-else>
        <!-- チャットヘッダー -->
        <ChatHeader
          :model="currentChatModel || ''"
          :system-prompt="currentChatSystemPrompt"
          :vector-store-id="currentChatVectorStoreId"
          :use-context="currentChatUseContext"
          @edit="showSettingsEditor = true"
        />

        <!-- メッセージ一覧 -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto">
          <div class="max-w-3xl mx-auto px-3 md:px-4 py-4 md:py-8">
            <ChatMessage
              v-for="message in messages"
              :key="message.id"
              :message="message"
            />
            <LoadingIndicator v-if="isLoading" />
          </div>
        </div>

        <!-- 入力欄 -->
        <ChatInput :disabled="isLoading" @submit="handleSendMessage" />
      </template>
    </div>

    <!-- モデル選択ダイアログ -->
    <ModelSelectorDialog
      v-model="showModelSelector"
      :models="availableModels"
      :is-loading-models="isLoadingModels"
      :default-model="selectedModel"
      @create="handleCreateChatFromDialog"
    />

    <!-- 設定編集ダイアログ -->
    <SettingsEditorDialog
      v-model="showSettingsEditor"
      :models="availableModels"
      :current-model="currentChatModel"
      :current-system-prompt="currentChatSystemPrompt"
      :current-vector-store-id="currentChatVectorStoreId"
      :current-use-context="currentChatUseContext"
      @save="handleSaveSettings"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const {
  chats,
  currentChatId,
  currentChatModel,
  currentChatSystemPrompt,
  currentChatVectorStoreId,
  currentChatUseContext,
  messages,
  isLoading,
  fetchChats,
  createChat,
  selectChat,
  sendMessage,
  deleteChat,
  renameChat,
  updateChatSettings,
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
const selectedModel = ref<string>('gpt-4o');
const isLoadingModels = ref(false);
const showModelSelector = ref(false);
const showSettingsEditor = ref(false);

// モバイル用サイドバー状態
const isSidebarOpen = ref(false);

// メッセージコンテナ
const messagesContainer = ref<HTMLElement | null>(null);

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
      if (data.models.some(m => m.id === 'gpt-4o')) {
        selectedModel.value = 'gpt-4o';
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

// 初期化
onMounted(async () => {
  await Promise.all([fetchChats(), fetchModels()]);

  // URLのIDからチャットを選択
  const chatId = route.params.id as string;
  if (chatId && chats.value.some(c => c.id === chatId)) {
    await selectChat(chatId);
  } else {
    // チャットが見つからない場合はホームへ
    router.replace('/');
  }
});

// --- イベントハンドラ ---

const handleSelectChat = async (chatId: string) => {
  await selectChat(chatId);
  router.push(`/chat/${chatId}`);
  isSidebarOpen.value = false;
};

const handleNewChat = () => {
  showModelSelector.value = true;
};

const handleCreateChatFromDialog = async (model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean) => {
  try {
    const chatId = await createChat(model, undefined, systemPrompt, vectorStoreId, useContext ?? true);
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
    isSidebarOpen.value = false;
  } catch (error) {
    console.error('Failed to create chat:', error);
    alert('チャットの作成に失敗しました');
  }
};

const handleDeleteChat = async (chatId: string) => {
  if (!confirm('このチャットを削除しますか?')) return;
  try {
    await deleteChat(chatId);
    if (currentChatId.value === null) {
      router.push('/');
    }
  } catch (error) {
    console.error('Failed to delete chat:', error);
    alert('チャットの削除に失敗しました');
  }
};

const handleRenameChat = async (chatId: string, name: string) => {
  try {
    await renameChat(chatId, name);
  } catch (error) {
    console.error('Failed to rename chat:', error);
  }
};

const handleReorderChats = async (fromIndex: number, toIndex: number) => {
  try {
    await reorderChats(fromIndex, toIndex);
  } catch (error) {
    console.error('Failed to reorder chats:', error);
  }
};

const handleNewChatWithMessage = async (message: string, model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean) => {
  try {
    const chatId = await createChat(model, undefined, systemPrompt, vectorStoreId, useContext ?? true);
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
    await sendMessage(message);
  } catch (error) {
    console.error('Failed to create chat with message:', error);
    alert('チャットの作成に失敗しました');
  }
};

const handleSendMessage = async (message: string) => {
  try {
    await sendMessage(message);
  } catch (error) {
    console.error('Failed to send message:', error);
    alert('メッセージの送信に失敗しました');
  }
};

const handleSaveSettings = async (model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean) => {
  if (!currentChatId.value) return;
  try {
    await updateChatSettings(currentChatId.value, model, systemPrompt, vectorStoreId, useContext);
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('設定の保存に失敗しました');
  }
};

// AIでタイトル生成
const handleGenerateTitle = async (chatId: string, excludeTitles?: string[]): Promise<string | null> => {
  try {
    // localStorageからメッセージを取得
    const data = localStorage.getItem('mygpt_data');
    if (!data) return null;
    const parsed = JSON.parse(data);
    const chatMessages = parsed.messages?.[chatId] || [];
    if (chatMessages.length === 0) return null;

    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatMessages.slice(0, 10),
        excludeTitles: excludeTitles || []
      })
    });

    if (response.ok) {
      const result = await response.json() as { title: string };
      return result.title;
    }
    return null;
  } catch (error) {
    console.error('Failed to generate title:', error);
    return null;
  }
};
</script>
