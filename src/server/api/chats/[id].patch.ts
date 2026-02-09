/**
 * PATCH /api/chats/:id - チャット設定変更（名前・モデル・システムプロンプト・Vector Store ID）
 */
import { updateChatName, updateChatSettings } from '~/server/utils/db/chats';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'チャットIDが必要です'
    });
  }

  // 名前の更新
  if (body?.name) {
    await updateChatName(event, id, body.name);
  }

  // モデル・システムプロンプト・Vector Store IDの更新
  if (body?.model !== undefined || body?.systemPrompt !== undefined || body?.vectorStoreId !== undefined) {
    await updateChatSettings(event, id, body.model, body.systemPrompt, body.vectorStoreId);
  }

  return { success: true };
});
