/**
 * 音声日記 composable
 * 録音 → 文字起こし → 保存のフローを管理
 * デュアル環境対応（localStorage / API）
 */
import { ref, readonly } from 'vue';
import type { DiaryEntry } from '~/types';
import { isLocalEnvironment } from '~/utils/environment';
import { loadDiaryEntries, saveDiaryEntries } from '~/utils/diaryStorage';
import { getUserFromStorage } from '~/utils/storage';

const entries = ref<DiaryEntry[]>([]);
const isRecording = ref(false);
const isTranscribing = ref(false);
const recordingDuration = ref(0);

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let durationTimer: ReturnType<typeof setInterval> | null = null;

export function useDiary() {
  const loadEntries = async () => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) {
        entries.value = [];
        return;
      }
      entries.value = loadDiaryEntries(user.id);
    } else {
      const res = await fetch('/api/diary');
      if (res.ok) {
        const data = (await res.json()) as { entries: DiaryEntry[] };
        entries.value = data.entries;
      }
    }
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

    const duration = recordingDuration.value;

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

      if (!text || text.trim().length === 0) {
        return;
      }

      // Save entry
      await saveEntry(text, duration);
    } finally {
      isTranscribing.value = false;
    }
  };

  const saveEntry = async (content: string, duration?: number) => {
    if (isLocalEnvironment()) {
      const user = getUserFromStorage();
      if (!user) return;

      const entry: DiaryEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: user.id,
        content,
        duration,
        createdAt: Date.now(),
      };
      entries.value = [entry, ...entries.value];
      saveDiaryEntries(user.id, entries.value);
    } else {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, duration }),
      });
      if (res.ok) {
        const entry = (await res.json()) as DiaryEntry;
        entries.value = [entry, ...entries.value];
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
  };

  return {
    entries: readonly(entries),
    isRecording: readonly(isRecording),
    isTranscribing: readonly(isTranscribing),
    recordingDuration: readonly(recordingDuration),
    loadEntries,
    startRecording,
    stopRecording,
    deleteEntry,
  };
}
