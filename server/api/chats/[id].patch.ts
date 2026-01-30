/**
 * PATCH /api/chats/:id - チャット設定変更（名前・モデル・システムプロンプト）
 */
import { updateChatName, updateChatSettings } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Chat ID is required'
    });
  }

  // 名前の更新
  if (body?.name) {
    await updateChatName(event, id, body.name);
  }

  // モデル・システムプロンプトの更新
  if (body?.model !== undefined || body?.systemPrompt !== undefined) {
    await updateChatSettings(event, id, body.model, body.systemPrompt);
  }

  return { success: true };
});
