import { getAllPresets } from '../../utils/db/presets';

export default defineEventHandler(async (event) => {
  const presets = await getAllPresets(event);
  return {
    presets: presets.map(p => ({
      id: p.id,
      name: p.name,
      model: p.model,
      systemPrompt: p.system_prompt,
      vectorStoreId: p.vector_store_id,
      useContext: p.use_context,
      createdAt: p.created_at
    }))
  };
});
