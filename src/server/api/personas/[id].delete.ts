import { deletePersona } from '../../utils/db/personas';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ペルソナIDが必要です'
    });
  }

  await deletePersona(event, id);

  return { success: true };
});
