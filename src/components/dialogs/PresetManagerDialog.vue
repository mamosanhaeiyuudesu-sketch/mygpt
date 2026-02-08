<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="isEditing ? cancelAll() : emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700 max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('presetManager.title') }}</h2>
        <button
          @click="isEditing ? cancelAll() : emit('update:modelValue', false)"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- プリセット一覧 -->
      <div class="flex-1 overflow-y-auto space-y-2 mb-4">
        <div v-if="presets.length === 0 && !isAdding" class="text-center text-gray-500 py-8">
          {{ t('presetManager.empty') }}
        </div>

        <div
          v-for="preset in presets"
          v-show="!isEditing || editingId === preset.id"
          :key="preset.id"
          class="bg-gray-800 rounded-lg border border-gray-700"
        >
          <!-- 表示モード -->
          <div v-if="editingId !== preset.id" class="flex items-center justify-between px-4 py-3">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate">{{ preset.name }}</div>
              <div class="text-xs text-gray-400 truncate">{{ preset.model }}</div>
            </div>
            <div class="flex gap-1 ml-2 shrink-0">
              <button
                @click="startEdit(preset)"
                class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                {{ t('presetManager.edit') }}
              </button>
              <button
                @click="handleDelete(preset.id)"
                class="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
              >
                {{ t('presetManager.delete') }}
              </button>
            </div>
          </div>

          <!-- 編集モード -->
          <div v-else class="p-4 space-y-3">
            <div>
              <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.name') }}</label>
              <input
                v-model="editForm.name"
                type="text"
                :placeholder="t('presetManager.name.placeholder')"
                class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.model') }}</label>
              <select
                v-model="editForm.model"
                class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="model in models" :key="model.id" :value="model.id">
                  {{ model.name }} ({{ model.contextWindow }})
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.systemPrompt') }}</label>
              <textarea
                v-model="editForm.systemPrompt"
                :placeholder="t('presetManager.systemPrompt.placeholder')"
                rows="2"
                class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              ></textarea>
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.vectorStoreId') }}</label>
              <input
                v-model="editForm.vectorStoreId"
                type="text"
                :placeholder="t('presetManager.vectorStoreId.placeholder')"
                class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="editForm.useContext"
                  type="checkbox"
                  class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm text-gray-400">{{ t('presetManager.useContext') }}</span>
              </label>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                @click="cancelEdit"
                class="flex-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                {{ t('presetManager.cancel') }}
              </button>
              <button
                @click="saveEdit"
                :disabled="!editForm.name.trim()"
                class="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
              >
                {{ t('presetManager.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 新規追加ボタン / 新規追加フォーム -->
      <div v-if="isAdding" class="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3 mb-4">
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.name') }}</label>
          <input
            v-model="addForm.name"
            type="text"
            :placeholder="t('presetManager.name.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.model') }}</label>
          <select
            v-model="addForm.model"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name }} ({{ model.contextWindow }})
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.systemPrompt') }}</label>
          <textarea
            v-model="addForm.systemPrompt"
            :placeholder="t('presetManager.systemPrompt.placeholder')"
            rows="2"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          ></textarea>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('presetManager.vectorStoreId') }}</label>
          <input
            v-model="addForm.vectorStoreId"
            type="text"
            :placeholder="t('presetManager.vectorStoreId.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              v-model="addForm.useContext"
              type="checkbox"
              class="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm text-gray-400">{{ t('presetManager.useContext') }}</span>
          </label>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            @click="cancelAdd"
            class="flex-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {{ t('presetManager.cancel') }}
          </button>
          <button
            @click="saveAdd"
            :disabled="!addForm.name.trim()"
            class="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
          >
            {{ t('presetManager.save') }}
          </button>
        </div>
      </div>

      <button
        v-if="!isAdding && !editingId"
        @click="startAdd"
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('presetManager.add') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types';
import { usePresets } from '~/composables/usePresets';

const props = defineProps<{
  modelValue: boolean;
  models: Model[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { presets, loadPresets, createPreset, updatePreset, deletePreset } = usePresets();

// 編集状態
const editingId = ref<string | null>(null);
const editForm = reactive({
  name: '',
  model: '',
  systemPrompt: '',
  vectorStoreId: '',
  useContext: true,
});

// 新規追加状態
const isAdding = ref(false);

// 編集中かどうか（編集中または新規追加中）
const isEditing = computed(() => editingId.value !== null || isAdding.value);
const addForm = reactive({
  name: '',
  model: 'gpt-4o',
  systemPrompt: '',
  vectorStoreId: '',
  useContext: true,
});

// ダイアログが開かれたときにプリセットを読み込む
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPresets();
    editingId.value = null;
    isAdding.value = false;
  }
});

const startEdit = (preset: { id: string; name: string; model: string; systemPrompt: string | null; vectorStoreId: string | null; useContext: boolean }) => {
  isAdding.value = false;
  editingId.value = preset.id;
  editForm.name = preset.name;
  editForm.model = preset.model;
  editForm.systemPrompt = preset.systemPrompt || '';
  editForm.vectorStoreId = preset.vectorStoreId || '';
  editForm.useContext = preset.useContext;
};

const cancelAll = () => {
  editingId.value = null;
  isAdding.value = false;
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async () => {
  if (!editingId.value || !editForm.name.trim()) return;
  await updatePreset(
    editingId.value,
    editForm.name.trim(),
    editForm.model,
    editForm.systemPrompt.trim() || null,
    editForm.vectorStoreId.trim() || null,
    editForm.useContext
  );
  editingId.value = null;
};

const handleDelete = async (id: string) => {
  if (!confirm(t('presetManager.deleteConfirm'))) return;
  await deletePreset(id);
  if (editingId.value === id) {
    editingId.value = null;
  }
};

const startAdd = () => {
  editingId.value = null;
  isAdding.value = true;
  addForm.name = '';
  addForm.model = props.models.length > 0 ? props.models[0].id : 'gpt-4o';
  addForm.systemPrompt = '';
  addForm.vectorStoreId = '';
  addForm.useContext = true;
};

const cancelAdd = () => {
  isAdding.value = false;
};

const saveAdd = async () => {
  if (!addForm.name.trim()) return;
  await createPreset(
    addForm.name.trim(),
    addForm.model,
    addForm.systemPrompt.trim() || null,
    addForm.vectorStoreId.trim() || null,
    addForm.useContext
  );
  isAdding.value = false;
};
</script>
