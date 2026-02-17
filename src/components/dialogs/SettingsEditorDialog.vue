<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700">
      <h2 class="text-lg font-bold mb-4">{{ t('settings.title') }}</h2>

      <div class="space-y-4">
        <!-- モデル選択 -->
        <div>
          <label class="text-sm text-gray-400 block mb-2">{{ t('settings.model') }}</label>
          <select
            v-model="editModel"
            class="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="m in models" :key="m.id" :value="m.id">
              {{ m.name }} ({{ m.contextWindow }})
            </option>
          </select>
        </div>

        <!-- ペルソナ選択（カード形式） -->
        <PersonaCardGrid :personas="personas" :selected-id="selectedPersonaId" :selected-model="editModel" @select="selectPersona" />

        <!-- 文脈保持設定 -->
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm text-gray-400">{{ t('settings.useContext') }}</label>
            <p class="text-xs text-gray-500 mt-0.5">{{ t('settings.useContext.description') }}</p>
          </div>
          <ToggleSwitch v-model="editUseContext" />
        </div>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          @click="emit('update:modelValue', false)"
          class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          {{ t('button.cancel') }}
        </button>
        <button
          @click="handleSave"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          {{ t('settings.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { usePersonas } from '~/composables/usePersonas';

const props = defineProps<{
  modelValue: boolean;
  models: Model[];
  currentModel?: string | null;
  currentSystemPrompt?: string | null;
  currentVectorStoreId?: string | null;
  currentUseContext?: boolean;
  currentPersonaId?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [model: string, systemPrompt: string | null, vectorStoreId: string | null, useContext: boolean, personaId: string | null];
}>();

const { t } = useI18n();
const { personas, loadPersonas } = usePersonas();

// フォーム状態
const editModel = ref('');
const editUseContext = ref(true);
const selectedPersonaId = ref('');

// ダイアログが開かれたときに現在の値をセット
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPersonas();
    editModel.value = props.currentModel || 'gpt-4o';
    editUseContext.value = props.currentUseContext !== false;
    selectedPersonaId.value = props.currentPersonaId || '';
  }
});

// モデル変更時、RAGペルソナが選択中なら解除
watch(editModel, (model) => {
  if (model?.startsWith('claude-') && selectedPersonaId.value) {
    const persona = personas.value.find(p => p.id === selectedPersonaId.value);
    if (persona?.vectorStoreId) {
      selectedPersonaId.value = '';
    }
  }
});

const selectPersona = (personaId: string) => {
  if (selectedPersonaId.value === personaId) {
    selectedPersonaId.value = '';
    return;
  }
  selectedPersonaId.value = personaId;
};

const handleSave = () => {
  const personaId = selectedPersonaId.value || null;
  // ペルソナ選択時はsystemPrompt/vectorStoreIdをnullにする（サーバー側で動的取得）
  emit('save', editModel.value, null, null, editUseContext.value, personaId);
  emit('update:modelValue', false);
};
</script>
