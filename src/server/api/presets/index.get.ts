import { getAllPresets } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const presets = await getAllPresets(event);
  return { presets };
});
