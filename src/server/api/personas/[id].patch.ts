import { updatePersona } from '../../utils/db/personas';

interface UpdatePersonaBody {
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
      statusMessage: 'ペルソナIDが必要です'
    });
  }

  const body = await readBody<UpdatePersonaBody>(event);

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は必須です'
    });
  }

  await updatePersona(
    event,
    id,
    body.name,
    body.systemPrompt ?? null,
    body.vectorStoreId ?? null,
    body.imageUrl ?? null
  );

  return {
    persona: {
      id,
      name: body.name,
      systemPrompt: body.systemPrompt ?? null,
      vectorStoreId: body.vectorStoreId ?? null,
      imageUrl: body.imageUrl ?? null
    }
  };
});
