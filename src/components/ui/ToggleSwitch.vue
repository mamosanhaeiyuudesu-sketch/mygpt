<template>
  <button
    type="button"
    @click="emit('update:modelValue', !modelValue)"
    :class="[
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
      modelValue ? 'bg-blue-600' : 'bg-gray-600'
    ]"
  >
    <span
      :class="[
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        modelValue ? 'translate-x-6' : 'translate-x-1'
      ]"
    />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();
</script>
