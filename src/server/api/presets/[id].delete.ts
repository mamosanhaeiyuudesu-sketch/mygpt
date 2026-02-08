import { deletePreset } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'プリセットIDが必要です'
    });
  }

  await deletePreset(event, id);

  return { success: true };
});
