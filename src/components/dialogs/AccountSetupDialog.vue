<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-2">アカウントを作成</h2>
      <p class="text-sm text-gray-400 mb-6">
        チャットを保存するためにアカウント名を設定してください。
      </p>

      <!-- アカウント名入力 -->
      <div class="mb-4">
        <label class="text-sm text-gray-400 block mb-2">アカウント名</label>
        <input
          v-model="accountName"
          type="text"
          placeholder="名前を入力"
          class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="handleCreate"
          autofocus
        />
      </div>

      <!-- エラーメッセージ -->
      <p v-if="errorMessage" class="text-red-400 text-sm mb-4">
        {{ errorMessage }}
      </p>

      <button
        @click="handleCreate"
        :disabled="!accountName.trim() || isCreating"
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        {{ isCreating ? '作成中...' : '作成' }}
      </button>
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

const { createAccount } = useAccount();

const accountName = ref('');
const errorMessage = ref('');
const isCreating = ref(false);

// ダイアログが開かれたときにリセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    accountName.value = '';
    errorMessage.value = '';
    isCreating.value = false;
  }
});

const handleCreate = async () => {
  const name = accountName.value.trim();
  if (!name) return;

  isCreating.value = true;
  errorMessage.value = '';

  const result = await createAccount(name);

  if (result.error) {
    errorMessage.value = result.error;
    isCreating.value = false;
    return;
  }

  emit('created');
  emit('update:modelValue', false);
};
</script>
