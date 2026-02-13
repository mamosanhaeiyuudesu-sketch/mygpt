import { generateId } from '../../utils/db/common';
import { createPreset } from '../../utils/db/presets';

interface CreatePresetBody {
  name: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  imageUrl?: string | null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePresetBody>(event);

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は必須です'
    });
  }

  const id = generateId('preset');
  const preset = await createPreset(
    event,
    id,
    body.name,
    body.systemPrompt ?? null,
    body.vectorStoreId ?? null,
    body.imageUrl ?? null
  );

  return {
    preset: {
      id: preset.id,
      name: preset.name,
      systemPrompt: preset.system_prompt,
      vectorStoreId: preset.vector_store_id,
      imageUrl: preset.image_url,
      createdAt: preset.created_at
    }
  };
});
