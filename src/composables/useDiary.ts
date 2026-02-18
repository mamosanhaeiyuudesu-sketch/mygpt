/**
 * 日記 composable
 * テキスト入力 + 音声入力 → 保存のフローを管理
 * デュアル環境対応（localStorage / API）
 */
import { ref, readonly, computed } from 'vue';
import type { DiaryEntry, DiarySection } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';
import { loadDiaryEntries, saveDiaryEntries } from '~/utils/diaryStorage';
import { getUserFromStorage } from '~/utils/storage';

const entries = ref<DiaryEntry[]>([]);
const currentEntryId = ref<string | null>(null);
const isRecording = ref(false);
const isTranscribing = ref(false);
const recordingDuration = ref(0);
const isEditing = ref(false);
const editingContent = ref('');
const editingEntryId = ref<string | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let durationTimer: ReturnType<typeof setInterval> | null = null;

/**
 * contentフィールドをセクション配列にパース
 * 後方互換: JSONでなければ単一セクションとして扱う
 */
function parseSections(content: string): DiarySection[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // JSON でなければ旧形式（プレーンテキスト）
  }
  return [{ text: content, completedAt: 0 }];
}

/**
 * セクション配列をJSON文字列にシリアライズ
 */
function serializeSections(sections: DiarySection[]): string {
  return JSON.stringify(sections);
}

/**
 * セクション配列からタイトル生成用のプレーンテキストを取得
 */
function sectionsToPlainText(sections: DiarySection[]): string {
  return sections.map(s => s.text).join('\n');
}

/**
 * エントリの最終更新タイムスタンプを取得（最新セクションのcompletedAt、なければcreatedAt）
 */
function getLatestTimestamp(entry: DiaryEntry): number {
  const sections = parseSections(entry.content);
  if (sections.length > 0) {
    const maxCompletedAt = Math.max(...sections.map(s => s.completedAt || 0));
    if (maxCompletedAt > 0) return maxCompletedAt;
  }
  return entry.createdAt;
}

/**
 * エントリ配列を最終更新日時の降順でソート
 */
function sortEntriesByLatest(entries: DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a));
}

export function useDiary() {
  const currentEntry = computed(() =>
    entries.value.find(e => e.id === currentEntryId.value) || null
  );

  const currentSections = computed(() => {
    if (!currentEntry.value) return [];
    return parseSections(currentEntry.value.content);
  });

  const loadEntries = async () => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) {
        entries.value = [];
        return;
      }
      entries.value = sortEntriesByLatest(loadDiaryEntries(user.id));
    } else {
      const res = await fetch('/api/diary');
      if (res.ok) {
        const data = (await res.json()) as { entries: DiaryEntry[] };
        entries.value = sortEntriesByLatest(data.entries);
      }
    }
  };

  const selectEntry = (entryId: string | null) => {
    currentEntryId.value = entryId;
    if (entryId) {
      isEditing.value = true;
      editingContent.value = '';
      editingEntryId.value = entryId;
    } else {
      isEditing.value = false;
      editingContent.value = '';
      editingEntryId.value = null;
    }
  };

  const startNewEntry = () => {
    currentEntryId.value = null;
    isEditing.value = true;
    editingContent.value = '';
    editingEntryId.value = null;
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recordingDuration.value = 0;

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.start();
    isRecording.value = true;

    durationTimer = setInterval(() => {
      recordingDuration.value++;
    }, 1000);
  };

  const stopRecording = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    // Wait for MediaRecorder to stop and collect all data
    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder!.onstop = () => {
        resolve(new Blob(audioChunks, { type: 'audio/webm' }));
      };
      mediaRecorder!.stop();
    });

    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorder = null;
    isRecording.value = false;

    // Transcribe
    isTranscribing.value = true;
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const res = await fetch('/api/diary/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Transcription failed');
      }

      const { text } = (await res.json()) as { text: string };

      if (text && text.trim().length > 0) {
        // 末尾に追加
        if (editingContent.value.length > 0 && !editingContent.value.endsWith('\n')) {
          editingContent.value += '\n';
        }
        editingContent.value += text.trim();
      }
    } finally {
      isTranscribing.value = false;
    }
  };

  const saveEditingEntry = async (): Promise<void> => {
    const text = editingContent.value.trim();
    if (!text) return;

    const newSection: DiarySection = { text, completedAt: Date.now() };

    if (editingEntryId.value) {
      // 既存エントリにセクション追加
      const existingSections = currentSections.value;
      const allSections = [...existingSections, newSection];
      const content = serializeSections(allSections);
      await updateEntryContent(editingEntryId.value, content);
    } else {
      // 新規作成
      const content = serializeSections([newSection]);
      const newEntry = await createEntry(content);
      if (newEntry) {
        editingEntryId.value = newEntry.id;
        currentEntryId.value = newEntry.id;
        // AIでタイトル生成（バックグラウンド）
        generateTitle(newEntry.id, text).catch(() => {});
      }
    }

    // フォームをクリア（次のセクション入力用）
    editingContent.value = '';
  };

  const createEntry = async (content: string, duration?: number): Promise<DiaryEntry | null> => {
    const sections = parseSections(content);
    const plainText = sectionsToPlainText(sections);
    const title = plainText.substring(0, 30).replace(/\n/g, ' ');

    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) return null;

      const entry: DiaryEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        title,
        content,
        duration,
        createdAt: Date.now(),
      };
      entries.value = [entry, ...entries.value];
      saveDiaryEntries(user.id, entries.value);
      return entry;
    } else {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, duration }),
      });
      if (res.ok) {
        const entry = (await res.json()) as DiaryEntry;
        entries.value = [entry, ...entries.value];
        return entry;
      }
    }
    return null;
  };

  const updateEntryContent = async (entryId: string, content: string): Promise<void> => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) return;
      entries.value = sortEntriesByLatest(entries.value.map(e =>
        e.id === entryId ? { ...e, content } : e
      ));
      saveDiaryEntries(user.id, entries.value);
    } else {
      const res = await fetch(`/api/diary/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        entries.value = sortEntriesByLatest(entries.value.map(e =>
          e.id === entryId ? { ...e, content } : e
        ));
      }
    }
  };

  const generateTitle = async (entryId: string, content: string) => {
    try {
      const res = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
        }),
      });
      if (res.ok) {
        const { title } = (await res.json()) as { title: string };
        if (title) {
          await renameEntry(entryId, title);
        }
      }
    } catch (e) {
      console.error('Failed to generate diary title:', e);
    }
  };

  const renameEntry = async (entryId: string, title: string) => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) return;
      entries.value = entries.value.map(e =>
        e.id === entryId ? { ...e, title } : e
      );
      saveDiaryEntries(user.id, entries.value);
    } else {
      const res = await fetch(`/api/diary/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        entries.value = entries.value.map(e =>
          e.id === entryId ? { ...e, title } : e
        );
      }
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) return;
      entries.value = entries.value.filter(e => e.id !== entryId);
      saveDiaryEntries(user.id, entries.value);
    } else {
      const res = await fetch(`/api/diary/${entryId}`, { method: 'DELETE' });
      if (res.ok) {
        entries.value = entries.value.filter(e => e.id !== entryId);
      }
    }
    if (currentEntryId.value === entryId) {
      currentEntryId.value = null;
    }
    if (editingEntryId.value === entryId) {
      editingEntryId.value = null;
      isEditing.value = false;
      editingContent.value = '';
    }
  };

  return {
    entries: readonly(entries),
    currentEntryId: readonly(currentEntryId),
    currentEntry,
    currentSections,
    isRecording: readonly(isRecording),
    isTranscribing: readonly(isTranscribing),
    recordingDuration: readonly(recordingDuration),
    isEditing,
    editingContent,
    editingEntryId: readonly(editingEntryId),
    loadEntries,
    selectEntry,
    startNewEntry,
    startRecording,
    stopRecording,
    saveEditingEntry,
    renameEntry,
    deleteEntry,
  };
}
