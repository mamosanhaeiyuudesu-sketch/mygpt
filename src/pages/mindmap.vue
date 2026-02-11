<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <AppNavigation />
    <div class="flex-1 flex items-center justify-center pb-9 md:pb-0">
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
        </svg>
        <h1 class="text-2xl font-bold text-gray-400">{{ t('nav.mindmap') }}</h1>
        <p class="text-gray-600 mt-2">Coming soon</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>
