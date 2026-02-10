/**
 * POST /api/diary/transcribe - 音声ファイルを文字起こし
 */
import { transcribeAudio } from '~/server/utils/openai';
import { getOpenAIKey } from '~/server/utils/env';

export default defineEventHandler(async (event) => {
  const apiKey = getOpenAIKey(event);

  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Audio file is required'
    });
  }

  const audioFile = formData.find(f => f.name === 'file');
  if (!audioFile || !audioFile.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Audio file is required'
    });
  }

  const filename = audioFile.filename || 'recording.webm';
  const text = await transcribeAudio(apiKey, audioFile.data, filename);

  return { text };
});
