/**
 * 多言語対応 Composable
 */
import type { Language } from '~/types';
import ja from '~/locales/ja.json';
import ko from '~/locales/ko.json';
import en from '~/locales/en.json';

const translations: Record<Language, Record<string, string>> = { ja, ko, en };

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

// グローバル状態
const currentLanguage = ref<Language>('ja');
const currentFontSize = ref<FontSize>('medium');

export const useI18n = () => {
  const t = (key: string): string => {
    return translations[currentLanguage.value][key] || key;
  };

  const setLanguage = (lang: Language) => {
    currentLanguage.value = lang;
  };

  const languageOptions: { value: Language; label: string }[] = [
    { value: 'ja', label: '日' },
    { value: 'ko', label: '한' },
    { value: 'en', label: 'En' },
  ];

  const setFontSize = (size: FontSize) => {
    currentFontSize.value = size;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.fontSize = size;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mygpt_fontSize', size);
    }
  };

  const initFontSize = () => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('mygpt_fontSize') as FontSize | null;
      if (saved && ['small', 'medium', 'large', 'xlarge'].includes(saved)) {
        setFontSize(saved);
      }
    }
  };

  const fontSizeOptions: { value: FontSize; labelKey: string }[] = [
    { value: 'small', labelKey: 'fontSize.small' },
    { value: 'medium', labelKey: 'fontSize.medium' },
    { value: 'large', labelKey: 'fontSize.large' },
    { value: 'xlarge', labelKey: 'fontSize.xlarge' },
  ];

  return {
    t,
    currentLanguage: readonly(currentLanguage),
    setLanguage,
    languageOptions,
    currentFontSize: readonly(currentFontSize),
    setFontSize,
    initFontSize,
    fontSizeOptions,
  };
};
