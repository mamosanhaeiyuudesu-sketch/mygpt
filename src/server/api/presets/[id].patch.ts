import { updatePreset } from '../../utils/db/presets';

interface UpdatePresetBody {
  name: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  imageUrl?: string | null;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'プリセットIDが必要です'
    });
  }

  const body = await readBody<UpdatePresetBody>(event);

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は必須です'
    });
  }

  await updatePreset(
    event,
    id,
    body.name,
    body.systemPrompt ?? null,
    body.vectorStoreId ?? null,
    body.imageUrl ?? null
  );

  return {
    preset: {
      id,
      name: body.name,
      systemPrompt: body.systemPrompt ?? null,
      vectorStoreId: body.vectorStoreId ?? null,
      imageUrl: body.imageUrl ?? null
    }
  };
});
