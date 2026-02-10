<template>
  <div class="flex items-center justify-center min-h-screen bg-[#212121]">
    <div class="w-full max-w-sm px-6">
      <h1 class="text-xl font-semibold text-white text-center mb-6">MyGPT</h1>
      <form @submit.prevent="handleSubmit">
        <input
          ref="inputRef"
          v-model="password"
          type="password"
          :placeholder="t('auth.placeholder')"
          class="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500"
          :disabled="isLoading"
        />
        <p v-if="error" class="mt-2 text-sm text-red-400">{{ t('auth.error') }}</p>
        <button
          type="submit"
          class="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          :disabled="isLoading || !password"
        >
          {{ isLoading ? '...' : t('auth.login') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

const password = ref('');
const error = ref(false);
const isLoading = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
});

const handleSubmit = async () => {
  error.value = false;
  isLoading.value = true;

  try {
    const res = await $fetch('/api/auth/verify', {
      method: 'POST',
      body: { password: password.value },
    });

    if (res.success) {
      // auth-checkキャッシュをクリアしてリダイレクト
      clearNuxtData('auth-check');
      await navigateTo('/chat', { replace: true });
    }
  } catch {
    error.value = true;
    password.value = '';
    inputRef.value?.focus();
  } finally {
    isLoading.value = false;
  }
};
</script>
