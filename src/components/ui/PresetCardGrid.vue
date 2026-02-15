<template>
  <div v-if="presets.length > 0">
    <label class="text-sm text-gray-400 block mb-2">{{ t('settings.preset') }}</label>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
      <button
        v-for="preset in presets"
        :key="preset.id"
        @click="emit('select', preset.id)"
        :class="[
          'rounded border p-2 text-left transition-colors',
          selectedId === preset.id
            ? 'bg-blue-600/20 border-blue-500'
            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
        ]"
      >
        <div class="flex items-center gap-1.5">
          <div class="shrink-0">
            <img
              v-if="preset.imageUrl"
              :src="preset.imageUrl"
              :alt="preset.name"
              class="w-8 h-8 rounded object-cover"
            />
            <div
              v-else
              class="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-500"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{{ preset.name }}</div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Preset } from '~/types';

defineProps<{
  presets: readonly Preset[];
  selectedId: string;
}>();

const emit = defineEmits<{
  select: [presetId: string];
}>();

const { t } = useI18n();
</script>
