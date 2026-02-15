import { generateId } from '../../utils/db/common';
import { createPersona } from '../../utils/db/personas';

interface CreatePersonaBody {
  name: string;
  systemPrompt?: string | null;
  vectorStoreId?: string | null;
  imageUrl?: string | null;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreatePersonaBody>(event);

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: '名前は必須です'
    });
  }

  const id = generateId('persona');
  const persona = await createPersona(
    event,
    id,
    body.name,
    body.systemPrompt ?? null,
    body.vectorStoreId ?? null,
    body.imageUrl ?? null
  );

  return {
    persona: {
      id: persona.id,
      name: persona.name,
      systemPrompt: persona.system_prompt,
      vectorStoreId: persona.vector_store_id,
      imageUrl: persona.image_url,
      createdAt: persona.created_at
    }
  };
});
