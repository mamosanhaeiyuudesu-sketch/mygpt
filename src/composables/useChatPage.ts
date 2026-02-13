/**
 * チャットページのイベントハンドラー・ロジック
 * [[id]].vue の <script setup> から抽出
 */
import type { Ref } from 'vue';
import type { Chat, Message, Model, Language } from '~/types';

interface UseChatPageOptions {
  // useChat() の戻り値
  chats: Ref<Chat[]>;
  currentChatId: Ref<string | null>;
  messages: Ref<Message[]>;
  isLoading: Ref<boolean>;
  createChat: (model: string, name?: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean) => Promise<string | undefined>;
  selectChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, name: string) => Promise<void>;
  updateChatSettings: (chatId: string, model?: string, systemPrompt?: string | null, vectorStoreId?: string | null, useContext?: boolean) => Promise<void>;
  reorderChats: (fromIndex: number, toIndex: number) => Promise<void>;

  // useAccount()
  initializeAccount: () => Promise<{ language?: Language } | null>;

  // useI18n()
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;

  // UI state
  isSidebarOpen: Ref<boolean>;
  showSettingsEditor: Ref<boolean>;
  showAccountSetup: Ref<boolean>;
  isPageReady: Ref<boolean>;

  // Navigation
  scrollToMessage: (messageId: string) => void;
}

export function useChatPage(options: UseChatPageOptions) {
  const {
    chats, currentChatId, messages,
    createChat, selectChat, sendMessage, deleteChat, renameChat, updateChatSettings, reorderChats,
    initializeAccount,
    t, setLanguage,
    isSidebarOpen, showSettingsEditor, showAccountSetup, isPageReady,
    scrollToMessage
  } = options;

  const router = useRouter();
  const route = useRoute();

  // モデル関連
  const config = useRuntimeConfig();
  const defaultModel = config.public.defaultModel as string || 'gpt-4o-mini';
  const availableModels = ref<Model[]>([]);
  const selectedModel = ref<string>(defaultModel);
  const isLoadingModels = ref(false);

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

  /**
   * 初期化
   */
  const initialize = async (fetchChats: () => Promise<void>) => {
    const user = await initializeAccount();
    if (!user) {
      showAccountSetup.value = true;
      isPageReady.value = true;
      return;
    }

    if (user.language) {
      setLanguage(user.language);
    }

    await Promise.all([fetchChats(), fetchModels()]);

    const chatId = route.params.id as string | undefined;
    if (chatId) {
      if (chats.value.some(c => c.id === chatId)) {
        await selectChat(chatId);
        // 最新の質問までスクロール
        nextTick(() => {
          const lastUserMessage = [...messages.value].reverse().find(m => m.role === 'user');
          if (lastUserMessage) {
            scrollToMessage(lastUserMessage.id);
          }
        });
      } else {
        router.replace('/chat');
      }
    }

    isPageReady.value = true;
  };

  // --- イベントハンドラ ---

  const handleSelectChat = async (chatId: string) => {
    isSidebarOpen.value = false;
    await selectChat(chatId);
    router.push(`/chat/${chatId}`);

    // 最新の質問（最後のユーザーメッセージ）までスクロール
    nextTick(() => {
      const lastUserMessage = [...messages.value].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        scrollToMessage(lastUserMessage.id);
      }
    });
  };

  const handleNewChat = () => {
    selectChat(null);
    navigateTo('/chat');
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

  const handleAccountCreated = async (fetchChats: () => Promise<void>) => {
    await Promise.all([fetchChats(), fetchModels()]);
  };

  // AIでタイトル生成
  const handleGenerateTitle = async (_chatId: string, excludeTitles?: string[]): Promise<string | null> => {
    try {
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

  const handleNewChatWithMessage = async (message: string, model: string, systemPrompt?: string, vectorStoreId?: string, useContext?: boolean) => {
    try {
      const chatId = await createChat(model, undefined, systemPrompt, vectorStoreId, useContext);
      if (chatId) {
        history.replaceState(null, '', `/chat/${chatId}`);
      }

      const sendPromise = sendMessage(message);

      await nextTick();
      const userMessage = messages.value[messages.value.length - 2];
      if (userMessage && userMessage.role === 'user') {
        scrollToMessage(userMessage.id);
      }

      await sendPromise;

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
      const sendPromise = sendMessage(message);

      await nextTick();
      const userMessage = messages.value[messages.value.length - 2];
      if (userMessage && userMessage.role === 'user') {
        scrollToMessage(userMessage.id);
      }

      await sendPromise;

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

  return {
    // Models
    availableModels,
    selectedModel,
    isLoadingModels,

    // Methods
    initialize,
    fetchModels,
    handleSelectChat,
    handleNewChat,
    handleDeleteChat,
    handleRenameChat,
    handleReorderChats,
    handleAccountCreated,
    handleGenerateTitle,
    handleNewChatWithMessage,
    handleSendMessage,
    handleSaveSettings
  };
}
