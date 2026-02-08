<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-2">{{ t('account') }}</h2>
      <p class="text-sm text-gray-400 mb-6">
        {{ t('account.description') }}
      </p>

      <!-- アカウント名入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">{{ t('account.name') }}</label>
        <input
          v-model="accountName"
          type="text"
          :placeholder="t('account.name.placeholder')"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="handleLogin"
          autofocus
        />
      </div>

      <!-- エラーメッセージ -->
      <p v-if="errorMessage" class="text-red-400 text-sm mb-4">
        {{ errorMessage }}
      </p>

      <div class="flex gap-3">
        <button
          @click="handleLogin"
          :disabled="!accountName.trim() || isProcessing"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {{ isProcessing ? t('account.processing') : t('account.login') }}
        </button>
        <button
          @click="handleCreate"
          :disabled="!accountName.trim() || isProcessing"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {{ isProcessing ? t('account.processing') : t('account.create') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  created: [];
}>();

const { createAccount, login } = useAccount();
const { t } = useI18n();

const accountName = ref('');
const errorMessage = ref('');
const isProcessing = ref(false);

// ダイアログが開かれたときにリセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    accountName.value = '';
    errorMessage.value = '';
    isProcessing.value = false;
  }
});

const handleLogin = async () => {
  const name = accountName.value.trim();
  if (!name) return;

  isProcessing.value = true;
  errorMessage.value = '';

  const result = await login(name);

  if (result.error) {
    errorMessage.value = result.error;
    isProcessing.value = false;
    return;
  }

  emit('created');
  emit('update:modelValue', false);
};

const handleCreate = async () => {
  const name = accountName.value.trim();
  if (!name) return;

  isProcessing.value = true;
  errorMessage.value = '';

  const result = await createAccount(name);

  if (result.error) {
    errorMessage.value = result.error;
    isProcessing.value = false;
    return;
  }

  emit('created');
  emit('update:modelValue', false);
};
</script>
