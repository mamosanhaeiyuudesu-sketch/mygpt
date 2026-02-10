<template>
  <div
    @click="emit('select')"
    class="group relative mb-1 px-3 py-3 rounded-lg cursor-pointer transition-colors"
    :class="isActive ? 'bg-gray-800' : 'hover:bg-gray-800'"
    @dblclick="startEditing"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- 編集モード -->
        <div v-if="isEditing" class="flex gap-1">
          <div class="relative flex-1 min-w-0">
            <input
              ref="editInputRef"
              v-model="editingTitle"
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
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        <!-- 表示モード -->
        <template v-else>
          <div class="font-medium text-sm truncate">{{ entry.title }}</div>
          <div class="text-xs text-gray-500 mt-1">
            {{ formatDate(entry.createdAt) }}
            <span v-if="entry.duration" class="text-gray-600 ml-1">({{ formatDurationShort(entry.duration) }})</span>
          </div>
        </template>
      </div>

      <!-- アクションボタン（ホバー時に表示） -->
      <div v-if="!isEditing" class="opacity-0 group-hover:opacity-100 flex gap-1 ml-2 transition-opacity">
        <!-- 編集ボタン -->
        <button
          @click.stop="startEditing"
          class="p-1 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <!-- 削除ボタン -->
        <button
          @click.stop="emit('delete')"
          class="p-1 hover:bg-gray-700 rounded"
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
interface Entry {
  id: string;
  title: string;
  duration?: number;
  createdAt: number;
}

const props = defineProps<{
  entry: Entry;
  isActive: boolean;
}>();

const emit = defineEmits<{
  select: [];
  delete: [];
  rename: [title: string];
}>();

const isEditing = ref(false);
const editingTitle = ref('');
const editInputRef = ref<HTMLInputElement | null>(null);

const startEditing = () => {
  isEditing.value = true;
  editingTitle.value = props.entry.title;
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus();
      editInputRef.value.select();
    }
  });
};

const finishEditing = () => {
  if (editingTitle.value.trim()) {
    emit('rename', editingTitle.value.trim());
  }
  isEditing.value = false;
  editingTitle.value = '';
};

const cancelEditing = () => {
  isEditing.value = false;
  editingTitle.value = '';
};

const handleBlur = (event: FocusEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  if (relatedTarget?.closest('button')) return;
  finishEditing();
};

const formatDate = (timestamp: number): string => {
  const d = new Date(timestamp);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
};

const formatDurationShort = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s}s` : `${s}s`;
};
</script>
