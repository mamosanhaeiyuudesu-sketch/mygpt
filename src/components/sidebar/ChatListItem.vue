<template>
  <div
    draggable="true"
    @dragstart="emit('dragstart', $event)"
    @dragover="emit('dragover', $event)"
    @dragend="emit('dragend')"
    @drop="emit('drop', $event)"
    @click="emit('select')"
    @dblclick="startEditing"
    class="group relative mb-1 px-3 py-3 rounded-lg cursor-pointer transition-colors"
    :class="[
      isActive ? 'bg-gray-800' : 'hover:bg-gray-800',
      isDragOver ? 'border-t-2 border-blue-500' : ''
    ]"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- 編集モード -->
        <div v-if="isEditing" class="flex gap-1">
          <div class="relative flex-1 min-w-0">
            <input
              ref="editInputRef"
              v-model="editingName"
              type="text"
              class="w-full bg-gray-700 text-white text-sm rounded pl-2 pr-7 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              @blur="handleBlur"
              @keyup.enter="finishEditing"
              @keyup.escape="cancelEditing"
              @click.stop
            />
            <button
              @click.stop="finishEditing"
              class="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-green-500 hover:text-green-400"
              title="決定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <button
            @click.stop="generateTitle"
            :disabled="isGenerating"
            class="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded whitespace-nowrap"
            title="AIでタイトル生成"
          >
            {{ isGenerating ? '...' : 'AI' }}
          </button>
        </div>
        <!-- 表示モード -->
        <template v-else>
          <div class="font-medium text-sm truncate">{{ chat.name }}</div>
          <div v-if="chat.lastMessage" class="text-xs text-gray-400 truncate mt-1">
            {{ chat.lastMessage }}
          </div>
        </template>
      </div>

      <!-- アクションボタン（ホバー時に表示） -->
      <div v-if="!isEditing" class="opacity-0 group-hover:opacity-100 flex gap-1 ml-2 transition-opacity">
        <!-- 編集ボタン -->
        <button
          @click.stop="startEditing"
          class="p-1 hover:bg-gray-700 rounded"
          title="名前を変更"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <!-- 削除ボタン -->
        <button
          @click.stop="emit('delete')"
          class="p-1 hover:bg-gray-700 rounded"
          title="削除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
}

const props = defineProps<{
  chat: Chat;
  isActive: boolean;
  isDragOver?: boolean;
  onGenerateTitle?: (chatId: string, excludeTitles?: string[]) => Promise<string | null>;
}>();

const emit = defineEmits<{
  select: [];
  delete: [];
  rename: [name: string];
  dragstart: [event: DragEvent];
  dragover: [event: DragEvent];
  dragend: [];
  drop: [event: DragEvent];
}>();

const isEditing = ref(false);
const editingName = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);
const isGenerating = ref(false);
const generatedTitles = ref<string[]>([]);

const startEditing = () => {
  isEditing.value = true;
  editingName.value = props.chat.name;
  generatedTitles.value = [];
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus();
      editInputRef.value.select();
    }
  });
};

const finishEditing = () => {
  if (editingName.value.trim()) {
    emit('rename', editingName.value.trim());
  }
  isEditing.value = false;
  editingName.value = '';
};

const cancelEditing = () => {
  isEditing.value = false;
  editingName.value = '';
};

// blurハンドラー（AI生成ボタンクリック時は終了しない）
const handleBlur = (event: FocusEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget?.closest('button')) return;
  finishEditing();
};

// AIでタイトル生成
const generateTitle = async () => {
  if (!props.onGenerateTitle) return;
  isGenerating.value = true;
  try {
    const title = await props.onGenerateTitle(props.chat.id, generatedTitles.value);
    if (title) {
      generatedTitles.value.push(title);
      editingName.value = title;
      editInputRef.value?.focus();
    }
  } catch (error) {
    console.error('Failed to generate title:', error);
  } finally {
    isGenerating.value = false;
  }
};
</script>
