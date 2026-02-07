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
              :ref="(el) => setMessageRef(message.id, el)"
              :message="message"
            />
            <LoadingIndicator v-if="isLoading" />
            <!-- スペーサー：最後のメッセージを画面上部にスクロールできるようにする -->
            <div class="h-[calc(100vh-200px)]"></div>
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
const config = useRuntimeConfig();
const defaultModel = config.public.defaultModel as string || 'gpt-4o-mini';
const availableModels = ref<Model[]>([]);
const selectedModel = ref<string>(defaultModel);
const isLoadingModels = ref(false);
const showModelSelector = ref(false);
const showSettingsEditor = ref(false);

// モバイル用サイドバー状態
const isSidebarOpen = ref(false);

// メッセージコンテナ
const messagesContainer = ref<HTMLElement | null>(null);

// メッセージ要素のref管理
const messageRefs = ref<Map<string, HTMLElement>>(new Map());
const setMessageRef = (id: string, el: unknown) => {
  if (el && (el as { $el?: HTMLElement }).$el) {
    messageRefs.value.set(id, (el as { $el: HTMLElement }).$el);
  }
};

// メッセージを画面上部にスクロール
const scrollToMessage = (messageId: string) => {
  nextTick(() => {
    const el = messageRefs.value.get(messageId);
    if (el && messagesContainer.value) {
      const containerRect = messagesContainer.value.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const scrollOffset = elRect.top - containerRect.top + messagesContainer.value.scrollTop - 10;
      messagesContainer.value.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
  });
};

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
      // 環境変数のデフォルトモデルがあればそれを使用、なければリストの最初
      if (data.models.some(m => m.id === defaultModel)) {
        selectedModel.value = defaultModel;
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

  // URLにIDがある場合はチャットを選択
  const chatId = route.params.id as string | undefined;
  if (chatId) {
    if (chats.value.some(c => c.id === chatId)) {
      await selectChat(chatId);
    } else {
      // チャットが見つからない場合はホームへ
      router.replace('/chat');
    }
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
      router.push('/chat');
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
    // URLを静かに更新（ページ遷移なし）
    if (chatId) {
      history.replaceState(null, '', `/chat/${chatId}`);
    }

    // sendMessageを開始（awaitせずにストリーミング開始直後にスクロール）
    const sendPromise = sendMessage(message);

    // 次のティックでスクロール（ユーザーメッセージが追加された直後）
    await nextTick();
    const userMessage = messages.value[messages.value.length - 2];
    if (userMessage && userMessage.role === 'user') {
      scrollToMessage(userMessage.id);
    }

    // ストリーミングの完了を待つ
    await sendPromise;

    // ストリーミング完了後、自動でタイトルを生成
    if (chatId) {
      const excludeTitles = chats.value
        .filter(c => c.id !== chatId)
        .map(c => c.name);
      const generatedTitle = await handleGenerateTitle(chatId, excludeTitles);
      if (generatedTitle) {
        await renameChat(chatId, generatedTitle);
      }
    }
  } catch (error) {
    console.error('Failed to create chat with message:', error);
    alert('チャットの作成に失敗しました');
  }
};

const handleSendMessage = async (message: string) => {
  try {
    // sendMessageを開始（awaitせずにストリーミング開始直後にスクロール）
    const sendPromise = sendMessage(message);

    // 次のティックでスクロール（ユーザーメッセージが追加された直後）
    await nextTick();
    const userMessage = messages.value[messages.value.length - 2];
    if (userMessage && userMessage.role === 'user') {
      scrollToMessage(userMessage.id);
    }

    // ストリーミングの完了を待つ
    await sendPromise;

    // タイトルが「New Chat」の場合、自動でタイトルを生成
    const currentChat = chats.value.find(c => c.id === currentChatId.value);
    if (currentChat && currentChat.name === 'New Chat') {
      const excludeTitles = chats.value
        .filter(c => c.id !== currentChatId.value)
        .map(c => c.name);
      const generatedTitle = await handleGenerateTitle(currentChatId.value!, excludeTitles);
      if (generatedTitle) {
        await renameChat(currentChatId.value!, generatedTitle);
      }
    }
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
