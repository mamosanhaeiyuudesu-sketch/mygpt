/**
 * MyGPT Chat Management Composable
 * ローカル環境: localStorage を使用（useChatLocal）
 * デプロイ環境: API (D1) を使用（useChatRemote）
 */
import type { Chat, Message } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';
import { useChatLocal } from '~/composables/useChatLocal';
import { useChatRemote } from '~/composables/useChatRemote';

export const useChat = () => {
  // 共有状態
  const chats = ref<Chat[]>([]);
  const currentChatId = ref<string | null>(null);
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  // 現在のチャットの computed プロパティ
  const currentChat = computed(() => {
    if (!currentChatId.value) return null;
    return chats.value.find(c => c.id === currentChatId.value) || null;
  });

  const currentConversationId = computed(() => currentChat.value?.conversationId || null);
  const currentChatModel = computed(() => currentChat.value?.model || null);
  const currentChatSystemPrompt = computed(() => currentChat.value?.systemPrompt || null);
  const currentChatVectorStoreId = computed(() => currentChat.value?.vectorStoreId || null);
  const currentChatUseContext = computed(() => currentChat.value?.useContext ?? true);

  // 環境に応じた実装を選択
  const state = {
    chats,
    currentChatId,
    messages,
    isLoading,
    currentConversationId,
    currentChatModel,
    currentChatSystemPrompt,
    currentChatVectorStoreId,
    currentChatUseContext
  };

  const ops = isLocalEnvironment() ? useChatLocal(state) : useChatRemote(state);

  return {
    // State
    chats,
    currentChatId,
    currentChatModel,
    currentChatSystemPrompt,
    currentChatVectorStoreId,
    currentChatUseContext,
    messages,
    isLoading,

    // Methods
    ...ops
  };
};
