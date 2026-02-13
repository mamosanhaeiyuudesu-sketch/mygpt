import { getAllPresets } from '../../utils/db/presets';

export default defineEventHandler(async (event) => {
  const presets = await getAllPresets(event);
  return {
    presets: presets.map(p => ({
      id: p.id,
      name: p.name,
      systemPrompt: p.system_prompt,
      vectorStoreId: p.vector_store_id,
      imageUrl: p.image_url,
      createdAt: p.created_at
    }))
  };
});
