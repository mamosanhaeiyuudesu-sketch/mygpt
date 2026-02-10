<template>
  <!-- PC: 縦アイコンナビ -->
  <nav class="hidden md:flex flex-col items-center w-16 flex-shrink-0 bg-gray-950 border-r border-gray-800 py-4 gap-1">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors"
      :class="isActive(item.to) ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'"
    >
      <div class="w-5 h-5" v-html="item.icon" />
      <span class="text-[10px] mt-0.5 leading-tight">{{ item.label }}</span>
    </NuxtLink>
  </nav>

  <!-- モバイル: ボトムナビ -->
  <nav class="fixed bottom-0 left-0 right-0 h-14 bg-gray-950 border-t border-gray-800 flex md:hidden z-50">
    <NuxtLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex-1 flex flex-col items-center justify-center transition-colors"
      :class="isActive(item.to) ? 'text-white' : 'text-gray-500'"
    >
      <div class="w-5 h-5" v-html="item.icon" />
      <span class="text-[10px] mt-0.5">{{ item.label }}</span>
    </NuxtLink>
  </nav>

  <!-- アカウントバッジ（右上固定） -->
  <div v-if="currentUser" class="fixed top-4 right-2 md:top-4 md:right-4 z-50">
    <AccountBadge
      :user-name="currentUser.name"
      @logout="handleLogout"
      @language-change="handleLanguageChange"
      @open-preset-manager="$emit('openPresetManager')"
    />
  </div>

  <!-- アカウント設定ダイアログ -->
  <AccountSetupDialog
    v-model="showAccountSetup"
    @created="$emit('accountCreated')"
  />
</template>

<script setup lang="ts">
import type { Language } from '~/types';

defineEmits<{
  openPresetManager: [];
  accountCreated: [];
}>();

const { t, setLanguage } = useI18n();
const { currentUser, initialize: initializeAccount, logout, updateLanguage } = useAccount();
const route = useRoute();

const showAccountSetup = ref(false);

// ナビゲーション項目
const navItems = computed(() => [
  {
    to: '/chat',
    label: t('nav.chat'),
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
  },
  {
    to: '/diary',
    label: t('nav.diary'),
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>',
  },
  {
    to: '/mindmap',
    label: t('nav.mindmap'),
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>',
  },
]);

const isActive = (to: string) => {
  return route.path === to || route.path.startsWith(to + '/');
};

// アカウント初期化
const initAccount = async () => {
  const user = await initializeAccount();
  if (!user) {
    showAccountSetup.value = true;
  } else if (user.language) {
    setLanguage(user.language);
  }
};

const handleLogout = async () => {
  if (!confirm(t('logout.confirm'))) return;
  await logout();
  window.location.reload();
};

const handleLanguageChange = async (language: Language) => {
  await updateLanguage(language);
};

onMounted(() => initAccount());

defineExpose({ showAccountSetup });
</script>
