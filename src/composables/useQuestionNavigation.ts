/**
 * 質問ナビゲーション Composable
 * ユーザーメッセージ間のスクロールナビゲーションを提供
 */
import type { Ref } from 'vue';
import type { Message } from '~/types';

export function useQuestionNavigation(
  messages: Ref<Message[]>,
  messagesContainer: Ref<HTMLElement | null>
) {
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

  // 質問（ユーザーメッセージ）のナビゲーション
  const userMessages = computed(() => messages.value.filter(m => m.role === 'user'));
  const currentQuestionIndex = ref(0);

  // 現在表示中の質問を検出（スクロール位置から）
  const updateCurrentQuestionIndex = () => {
    if (!messagesContainer.value || userMessages.value.length === 0) return;

    const containerTop = messagesContainer.value.getBoundingClientRect().top;
    let closestIndex = 0;
    let closestDistance = Infinity;

    userMessages.value.forEach((msg, index) => {
      const el = messageRefs.value.get(msg.id);
      if (el) {
        const elTop = el.getBoundingClientRect().top;
        const distance = Math.abs(elTop - containerTop);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    });

    currentQuestionIndex.value = closestIndex;
  };

  // スクロールイベントでインデックスを更新
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  const handleScroll = () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateCurrentQuestionIndex, 100);
  };

  // スクロールリスナーの設定
  watch(messagesContainer, (container, oldContainer) => {
    if (oldContainer) {
      oldContainer.removeEventListener('scroll', handleScroll);
    }
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
  });

  onUnmounted(() => {
    if (messagesContainer.value) {
      messagesContainer.value.removeEventListener('scroll', handleScroll);
    }
  });

  // ナビゲーション可否
  const canGoPrevious = computed(() => userMessages.value.length > 0 && currentQuestionIndex.value > 0);
  const canGoNext = computed(() => userMessages.value.length > 0 && currentQuestionIndex.value < userMessages.value.length - 1);

  // 前の質問へ移動
  const goToPreviousQuestion = () => {
    if (!canGoPrevious.value) return;
    const prevIndex = currentQuestionIndex.value - 1;
    const prevMessage = userMessages.value[prevIndex];
    if (prevMessage) {
      currentQuestionIndex.value = prevIndex;
      scrollToMessage(prevMessage.id);
    }
  };

  // 次の質問へ移動
  const goToNextQuestion = () => {
    if (!canGoNext.value) return;
    const nextIndex = currentQuestionIndex.value + 1;
    const nextMessage = userMessages.value[nextIndex];
    if (nextMessage) {
      currentQuestionIndex.value = nextIndex;
      scrollToMessage(nextMessage.id);
    }
  };

  return {
    messageRefs,
    setMessageRef,
    scrollToMessage,
    canGoPrevious,
    canGoNext,
    goToPreviousQuestion,
    goToNextQuestion
  };
}
