<template>
  <div class="md:hidden flex items-center py-1 px-2 border-b border-gray-800">
    <button
      @click="emit('openSidebar')"
      class="p-0.5 hover:bg-gray-800 rounded-lg"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <span class="ml-2 font-semibold text-sm">{{ title || t('nav.chat') }}</span>
    <span v-if="model" class="ml-2 text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">{{ model }}</span>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

withDefaults(defineProps<{
  title?: string;
  model?: string | null;
}>(), {
  title: '',
});

const emit = defineEmits<{
  openSidebar: [];
}>();
</script>
