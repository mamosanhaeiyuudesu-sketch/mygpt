<template>
  <div class="md:hidden flex items-center py-[5px] px-3 border-b border-gray-800">
    <button
      @click="emit('openSidebar')"
      class="p-1 hover:bg-gray-800 rounded-lg"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <span class="ml-3 font-semibold">{{ title || t('nav.chat') }}</span>
    <span v-if="model" class="ml-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{{ model }}</span>
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
