import { createPreset, generateId } from '../../utils/db';

interface CreatePresetBody {
  name: string;
  model: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  useContext?: boolean;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePresetBody>(event);

  if (!body.name || !body.model) {
    throw createError({
      statusCode: 400,
      message: 'name and model are required'
    });
  }

  const id = generateId('preset');
  const preset = await createPreset(
    event,
    id,
    body.name,
    body.model,
    body.systemPrompt ?? null,
    body.vectorStoreId ?? null,
    body.useContext ?? true
  );

  return { preset };
});
