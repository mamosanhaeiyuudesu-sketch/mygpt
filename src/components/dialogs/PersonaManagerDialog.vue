<template>
  <!-- ペルソナ一覧ダイアログ -->
  <div
    v-if="modelValue && !editingId && !isAdding"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="emit('update:modelValue', false)"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-[540px] w-full md:w-[80%] border border-gray-700 max-h-[80vh] flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('personaManager.title') }}</h2>
        <button
          @click="emit('update:modelValue', false)"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto mb-4">
        <div v-if="personas.length === 0" class="text-center text-gray-500 py-8">
          {{ t('personaManager.empty') }}
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div
            v-for="persona in personas"
            :key="persona.id"
            class="bg-gray-800 rounded border border-gray-700"
          >
            <div class="flex items-center px-2 py-2 gap-1.5">
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{{ persona.name }}</div>
              </div>
              <div class="shrink-0">
                <img
                  v-if="persona.imageUrl"
                  :src="persona.imageUrl"
                  :alt="persona.name"
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
              <div class="flex flex-col gap-0.5 shrink-0">
                <button
                  @click="startEdit(persona)"
                  class="px-1.5 py-0.5 text-[10px] bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  {{ t('personaManager.edit') }}
                </button>
                <button
                  @click="handleDelete(persona.id)"
                  class="px-1.5 py-0.5 text-[10px] bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                >
                  {{ t('personaManager.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="startAdd"
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        {{ t('personaManager.add') }}
      </button>
    </div>
  </div>

  <!-- 編集ダイアログ（独立） -->
  <div
    v-if="modelValue && editingId"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="cancelEdit"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('personaManager.editTitle') }}</h2>
        <button
          @click="cancelEdit"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.name') }}</label>
          <input
            v-model="editForm.name"
            type="text"
            :placeholder="t('personaManager.name.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.systemPrompt') }}</label>
          <textarea
            v-model="editForm.systemPrompt"
            :placeholder="t('personaManager.systemPrompt.placeholder')"
            rows="2"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          ></textarea>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.vectorStoreId') }}</label>
          <input
            v-model="editForm.vectorStoreId"
            type="text"
            :placeholder="t('personaManager.vectorStoreId.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.image') }}</label>
          <div class="flex items-center gap-3">
            <img
              v-if="editForm.imageUrl"
              :src="editForm.imageUrl"
              alt="preview"
              class="w-12 h-12 rounded-lg object-cover"
            />
            <div
              v-else
              class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="flex gap-2">
              <label class="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                {{ t('personaManager.imageUpload') }}
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleEditImageUpload"
                />
              </label>
              <button
                @click="generateEditImage"
                :disabled="generatingImage"
                class="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-1"
              >
                <svg v-if="generatingImage" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI
              </button>
              <button
                v-if="editForm.imageUrl"
                @click="editForm.imageUrl = ''"
                class="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
              >
                {{ t('personaManager.delete') }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            @click="cancelEdit"
            class="flex-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {{ t('personaManager.cancel') }}
          </button>
          <button
            @click="saveEdit"
            :disabled="!editForm.name.trim()"
            class="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
          >
            {{ t('personaManager.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 新規作成ダイアログ（独立） -->
  <div
    v-if="modelValue && isAdding"
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click.self="cancelAdd"
  >
    <div class="bg-gray-900 rounded-lg p-6 max-w-lg w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">{{ t('personaManager.addTitle') }}</h2>
        <button
          @click="cancelAdd"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.name') }}</label>
          <input
            v-model="addForm.name"
            type="text"
            :placeholder="t('personaManager.name.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.systemPrompt') }}</label>
          <textarea
            v-model="addForm.systemPrompt"
            :placeholder="t('personaManager.systemPrompt.placeholder')"
            rows="2"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          ></textarea>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.vectorStoreId') }}</label>
          <input
            v-model="addForm.vectorStoreId"
            type="text"
            :placeholder="t('personaManager.vectorStoreId.placeholder')"
            class="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">{{ t('personaManager.image') }}</label>
          <div class="flex items-center gap-3">
            <img
              v-if="addForm.imageUrl"
              :src="addForm.imageUrl"
              alt="preview"
              class="w-12 h-12 rounded-lg object-cover"
            />
            <div
              v-else
              class="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-gray-500"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="flex gap-2">
              <label class="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition-colors">
                {{ t('personaManager.imageUpload') }}
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAddImageUpload"
                />
              </label>
              <button
                @click="generateAddImage"
                :disabled="generatingImage"
                class="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed rounded transition-colors flex items-center gap-1"
              >
                <svg v-if="generatingImage" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI
              </button>
              <button
                v-if="addForm.imageUrl"
                @click="addForm.imageUrl = ''"
                class="px-3 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
              >
                {{ t('personaManager.delete') }}
              </button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 pt-1">
          <button
            @click="cancelAdd"
            class="flex-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            {{ t('personaManager.cancel') }}
          </button>
          <button
            @click="saveAdd"
            :disabled="!addForm.name.trim()"
            class="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
          >
            {{ t('personaManager.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePersonas } from '~/composables/usePersonas';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { personas, loadPersonas, createPersona, updatePersona, deletePersona } = usePersonas();

// 編集状態
const editingId = ref<string | null>(null);
const editForm = reactive({
  name: '',
  systemPrompt: '',
  vectorStoreId: '',
  imageUrl: '',
});

// 新規追加状態
const isAdding = ref(false);
const addForm = reactive({
  name: '',
  systemPrompt: '',
  vectorStoreId: '',
  imageUrl: '',
});

// ダイアログが開かれたときにペルソナを読み込む
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    loadPersonas();
    editingId.value = null;
    isAdding.value = false;
  }
});

/**
 * 画像をリサイズしてBase64 Data URLに変換
 */
const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = Math.round(height * MAX_SIZE / width);
            width = MAX_SIZE;
          } else {
            width = Math.round(width * MAX_SIZE / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context failed')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const handleEditImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  editForm.imageUrl = await processImage(file);
  input.value = '';
};

const handleAddImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  addForm.imageUrl = await processImage(file);
  input.value = '';
};

const startEdit = (persona: { id: string; name: string; systemPrompt: string | null; vectorStoreId: string | null; imageUrl: string | null }) => {
  isAdding.value = false;
  editingId.value = persona.id;
  editForm.name = persona.name;
  editForm.systemPrompt = persona.systemPrompt || '';
  editForm.vectorStoreId = persona.vectorStoreId || '';
  editForm.imageUrl = persona.imageUrl || '';
};

const cancelEdit = () => {
  editingId.value = null;
};

const saveEdit = async () => {
  if (!editingId.value || !editForm.name.trim()) return;
  await updatePersona(
    editingId.value,
    editForm.name.trim(),
    editForm.systemPrompt.trim() || null,
    editForm.vectorStoreId.trim() || null,
    editForm.imageUrl || null
  );
  editingId.value = null;
};

const handleDelete = async (id: string) => {
  if (!confirm(t('personaManager.deleteConfirm'))) return;
  await deletePersona(id);
};

const startAdd = () => {
  editingId.value = null;
  isAdding.value = true;
  addForm.name = '';
  addForm.systemPrompt = '';
  addForm.vectorStoreId = '';
  addForm.imageUrl = '';
};

const cancelAdd = () => {
  isAdding.value = false;
};

const saveAdd = async () => {
  if (!addForm.name.trim()) return;
  await createPersona(
    addForm.name.trim(),
    addForm.systemPrompt.trim() || null,
    addForm.vectorStoreId.trim() || null,
    addForm.imageUrl || null
  );
  isAdding.value = false;
};

// AI画像生成
const generatingImage = ref(false);

const generateImage = async (form: { name: string; systemPrompt: string; imageUrl: string }) => {
  if (!form.name.trim()) {
    alert(t('personaManager.aiImage.needName'));
    return;
  }
  generatingImage.value = true;
  try {
    const res = await $fetch<{ imageUrl: string }>('/api/generate-image', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        systemPrompt: form.systemPrompt.trim() || null,
      },
    });
    form.imageUrl = res.imageUrl;
  } catch (e) {
    console.error('Failed to generate image:', e);
    alert(t('personaManager.aiImage.error'));
  } finally {
    generatingImage.value = false;
  }
};

const generateEditImage = () => generateImage(editForm);
const generateAddImage = () => generateImage(addForm);
</script>
