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
        v-if="isPageReady && !currentChatId"
        v-model:selected-model="selectedModel"
        :models="availableModels"
        :is-loading-models="isLoadingModels"
        :is-loading="isLoading"
        @submit="handleNewChatWithMessage"
      />

      <!-- チャット選択時 -->
      <template v-else-if="isPageReady && currentChatId">
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
          <!-- 質問ナビゲーション矢印（スクロールしても固定） -->
          <div class="sticky top-2 z-10 h-0">
            <div class="absolute right-2 md:right-4 flex flex-col gap-1">
              <button
                :disabled="!canGoPrevious"
                class="w-8 h-8 flex items-center justify-center rounded bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="前の質問へ"
                @click="goToPreviousQuestion"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                :disabled="!canGoNext"
                class="w-8 h-8 flex items-center justify-center rounded bg-gray-700/80 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="次の質問へ"
                @click="goToNextQuestion"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
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

    <!-- アカウント設定ダイアログ -->
    <AccountSetupDialog
      v-model="showAccountSetup"
      @created="handleAccountCreated"
    />

    <!-- プリセット管理ダイアログ -->
    <PresetManagerDialog
      v-model="showPresetManager"
      :models="availableModels"
    />

    <!-- アカウントバッジ（右上固定） -->
    <div v-if="currentUser" class="fixed top-2 right-2 md:top-4 md:right-4 z-50">
      <AccountBadge
        :user-name="currentUser.name"
        @logout="handleLogout"
        @language-change="handleLanguageChange"
        @open-preset-manager="showPresetManager = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { useQuestionNavigation } from '~/composables/useQuestionNavigation';

const route = useRoute();
const router = useRouter();

// アカウント管理
const { currentUser, initialize: initializeAccount, logout, updateLanguage } = useAccount();
const { t, setLanguage } = useI18n();
const showAccountSetup = ref(false);

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
const config = useRuntimeConfig();
const defaultModel = config.public.defaultModel as string || 'gpt-4o-mini';
const availableModels = ref<Model[]>([]);
const selectedModel = ref<string>(defaultModel);
const isLoadingModels = ref(false);
const showModelSelector = ref(false);
const showSettingsEditor = ref(false);
const showPresetManager = ref(false);

// ページ初期化完了フラグ
const isPageReady = ref(false);

// モバイル用サイドバー状態
const isSidebarOpen = ref(false);

// メッセージコンテナ
const messagesContainer = ref<HTMLElement | null>(null);

// 質問ナビゲーション
const {
  setMessageRef,
  scrollToMessage,
  canGoPrevious,
  canGoNext,
  goToPreviousQuestion,
  goToNextQuestion
} = useQuestionNavigation(messages, messagesContainer);

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
  // まずアカウントを確認
  const user = await initializeAccount();
  if (!user) {
    // ユーザーがいない場合はアカウント作成ダイアログを表示
    showAccountSetup.value = true;
    isPageReady.value = true;
    return;
  }

  // ユーザーの言語設定を反映
  if (user.language) {
    setLanguage(user.language);
  }

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

  isPageReady.value = true;
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
    alert(t('error.chatCreate'));
  }
};

const handleDeleteChat = async (chatId: string) => {
  if (!confirm(t('sidebar.deleteChat.confirm'))) return;
  try {
    await deleteChat(chatId);
    if (currentChatId.value === null) {
      router.push('/chat');
    }
  } catch (error) {
    console.error('Failed to delete chat:', error);
    alert(t('error.chatDelete'));
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

// アカウント作成完了時
const handleAccountCreated = async () => {
  // チャットとモデルを読み込む
  await Promise.all([fetchChats(), fetchModels()]);
};

// ログアウト
const handleLogout = async () => {
  if (!confirm(t('logout.confirm'))) return;
  await logout();
  // ページをリロードしてアカウント作成ダイアログを表示
  window.location.reload();
};

// 言語変更
const handleLanguageChange = async (language: 'ja' | 'ko' | 'en') => {
  await updateLanguage(language);
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
    alert(t('error.chatCreate'));
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
    alert(t('error.messageSend'));
  }
};

const handleSaveSettings = async (model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean) => {
  if (!currentChatId.value) return;
  try {
    await updateChatSettings(currentChatId.value, model, systemPrompt, vectorStoreId, useContext);
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert(t('error.settingsSave'));
  }
};

// AIでタイトル生成
const handleGenerateTitle = async (_chatId: string, excludeTitles?: string[]): Promise<string | null> => {
  try {
    // 現在のメッセージを使用（ローカル・リモート両対応）
    const chatMessages = messages.value;
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
