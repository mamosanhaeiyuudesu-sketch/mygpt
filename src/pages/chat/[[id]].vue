<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- アプリナビゲーション -->
    <AppNavigation
      @account-created="handleAccountCreated(fetchChats)"
    />

    <!-- モバイル用オーバーレイ -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <!-- サイドバー -->
    <ChatSidebar
      v-model:open="isSidebarOpen"
      :chats="chats"
      :current-chat-id="currentChatId"
      :on-generate-title="handleGenerateTitle"
      :user-name="currentUser?.name"
      @new-chat="handleNewChat"
      @select-chat="handleSelectChat"
      @delete-chat="handleDeleteChat"
      @rename-chat="handleRenameChat"
      @reorder-chats="handleReorderChats"
      @logout="handleLogout"
      @language-change="handleLanguageChange"
      @open-preset-manager="showPresetManager = true"
    />

    <!-- メインエリア -->
    <div class="flex-1 flex flex-col md:ml-0 pb-9 md:pb-0 bg-[#212121]">
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

    <!-- プリセット管理ダイアログ -->
    <PresetManagerDialog
      v-model="showPresetManager"
      :models="availableModels"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuestionNavigation } from '~/composables/useQuestionNavigation';
import { useChatPage } from '~/composables/useChatPage';

// アカウント管理
const { currentUser, handleLogout, handleLanguageChange } = usePageAuth();
const { initialize: initializeAccount } = useAccount();
const { t, setLanguage } = useI18n();

const {
  chats, currentChatId, currentChatModel, currentChatSystemPrompt,
  currentChatVectorStoreId, currentChatUseContext, messages, isLoading,
  fetchChats, createChat, selectChat, sendMessage, deleteChat, renameChat,
  updateChatSettings, reorderChats
} = useChat();

// UI state
const showAccountSetup = ref(false);
const showModelSelector = ref(false);
const showSettingsEditor = ref(false);
const showPresetManager = ref(false);
const isPageReady = ref(false);
const isSidebarOpen = ref(false);

// メッセージコンテナ
const messagesContainer = ref<HTMLElement | null>(null);

// 質問ナビゲーション
const {
  setMessageRef, scrollToMessage, canGoPrevious, canGoNext,
  goToPreviousQuestion, goToNextQuestion
} = useQuestionNavigation(messages, messagesContainer);

// ページロジック
const {
  availableModels, selectedModel, isLoadingModels,
  initialize, handleSelectChat, handleNewChat, handleCreateChatFromDialog,
  handleDeleteChat, handleRenameChat, handleReorderChats, handleAccountCreated,
  handleGenerateTitle,
  handleNewChatWithMessage, handleSendMessage, handleSaveSettings
} = useChatPage({
  chats, currentChatId, messages, isLoading,
  createChat, selectChat, sendMessage, deleteChat, renameChat, updateChatSettings, reorderChats,
  initializeAccount,
  t, setLanguage,
  isSidebarOpen, showModelSelector, showSettingsEditor, showAccountSetup, isPageReady,
  scrollToMessage
});

// 初期化
onMounted(() => initialize(fetchChats));
</script>
