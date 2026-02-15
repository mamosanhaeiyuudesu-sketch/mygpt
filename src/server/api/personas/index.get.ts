import { getAllPersonas } from '../../utils/db/personas';

export default defineEventHandler(async (event) => {
  const personas = await getAllPersonas(event);
  return {
    personas: personas.map(p => ({
      id: p.id,
      name: p.name,
      systemPrompt: p.system_prompt,
      vectorStoreId: p.vector_store_id,
      imageUrl: p.image_url,
      createdAt: p.created_at
    }))
  };
});
