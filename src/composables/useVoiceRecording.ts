/**
 * 音声録音・文字起こし composable
 * MediaRecorder APIで録音し、Whisper APIで文字起こしする共通ロジック
 */
import { ref, type Ref } from 'vue';

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let durationTimer: ReturnType<typeof setInterval> | null = null;

const isRecording = ref(false);
const isTranscribing = ref(false);
const recordingDuration = ref(0);

export function useVoiceRecording() {
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

  const stopRecording = async (targetRef: Ref<string>) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    const audioBlob = await new Promise<Blob>((resolve) => {
      mediaRecorder!.onstop = () => {
        resolve(new Blob(audioChunks, { type: 'audio/webm' }));
      };
      mediaRecorder!.stop();
    });

    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorder = null;
    isRecording.value = false;

    isTranscribing.value = true;
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Transcription failed');
      }

      const { text } = (await res.json()) as { text: string };

      if (text && text.trim().length > 0) {
        if (targetRef.value.length > 0 && !targetRef.value.endsWith('\n')) {
          targetRef.value += '\n';
        }
        targetRef.value += text.trim();
      }
    } finally {
      isTranscribing.value = false;
    }
  };

  return {
    isRecording: readonly(isRecording),
    isTranscribing: readonly(isTranscribing),
    recordingDuration: readonly(recordingDuration),
    startRecording,
    stopRecording,
  };
}
