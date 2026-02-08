<template>
  <div class="relative" style="top: -10px">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
    >
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span class="text-gray-200">{{ userName }}</span>
      <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- ドロップダウンメニュー -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
    >
      <!-- 言語選択 -->
      <div class="px-3 py-2 border-b border-gray-700">
        <div class="text-xs text-gray-400 mb-1">{{ t('language') }}</div>
        <div class="flex gap-1">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            @click="handleLanguageChange(option.value)"
            :class="[
              'px-2 py-1 text-xs rounded transition-colors',
              currentLanguage === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- ログアウト -->
      <button
        @click="handleLogout"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        {{ t('logout') }}
      </button>
    </div>

    <!-- クリック外で閉じる用のオーバーレイ -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { Language } from '~/types';

defineProps<{
  userName: string;
}>();

const emit = defineEmits<{
  logout: [];
  languageChange: [language: Language];
}>();

const { t, currentLanguage, languageOptions, setLanguage } = useI18n();

const isOpen = ref(false);

const handleLanguageChange = (language: Language) => {
  setLanguage(language);
  emit('languageChange', language);
};

const handleLogout = () => {
  isOpen.value = false;
  emit('logout');
};
</script>
