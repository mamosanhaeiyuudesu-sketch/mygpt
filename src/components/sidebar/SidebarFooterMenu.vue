<template>
  <div v-if="userName" class="relative border-t border-gray-800 p-3">
    <button
      @click="isMenuOpen = !isMenuOpen"
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
    >
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span class="text-gray-200 truncate">{{ userName }}</span>
    </button>

    <!-- メニュー（上方向にポップアップ） -->
    <div
      v-if="isMenuOpen"
      class="absolute bottom-full left-3 right-3 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
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

      <!-- 文字サイズ（モバイルのみ表示） -->
      <div class="px-3 py-2 border-b border-gray-700 md:hidden">
        <div class="text-xs text-gray-400 mb-1">{{ t('fontSize') }}</div>
        <div class="flex gap-1">
          <button
            v-for="option in fontSizeOptions"
            :key="option.value"
            @click="setFontSize(option.value)"
            :class="[
              'px-2 py-1 text-xs rounded transition-colors',
              currentFontSize === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            ]"
          >
            {{ t(option.labelKey) }}
          </button>
        </div>
      </div>

      <!-- 追加メニュー項目（slot） -->
      <slot name="menu-items" />

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
      v-if="isMenuOpen"
      class="fixed inset-0 z-40"
      @click="isMenuOpen = false"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { Language } from '~/types';

const props = defineProps<{
  userName?: string;
  sidebarOpen?: boolean;
}>();

const emit = defineEmits<{
  logout: [];
  languageChange: [language: Language];
}>();

const { t, currentLanguage, languageOptions, setLanguage, currentFontSize, setFontSize, fontSizeOptions } = useI18n();

const isMenuOpen = ref(false);

// サイドバーが閉じたらメニューも閉じる
watch(() => props.sidebarOpen, (open) => {
  if (!open) isMenuOpen.value = false;
});

const handleLanguageChange = (language: Language) => {
  setLanguage(language);
  emit('languageChange', language);
};

const handleLogout = () => {
  isMenuOpen.value = false;
  emit('logout');
};

defineExpose({ isMenuOpen });
</script>
