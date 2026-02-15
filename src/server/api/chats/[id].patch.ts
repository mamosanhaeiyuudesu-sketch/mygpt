/**
 * PATCH /api/chats/:id - チャット設定変更（名前・モデル・システムプロンプト・Vector Store ID）
 */
import { updateChatName, updateChatSettings } from '~/server/utils/db/chats';
import { getEncryptionKey, encryptIfKey, encryptNullable } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');
  const body = await readBody(event);

  await assertChatOwner(event, id, userId);

  const encKey = await getEncryptionKey(event);

  // 名前の更新
  if (body?.name) {
    const encName = await encryptIfKey(body.name, encKey);
    await updateChatName(event, id, encName);
  }

  // モデル・システムプロンプト・Vector Store IDの更新
  if (body?.model !== undefined || body?.systemPrompt !== undefined || body?.vectorStoreId !== undefined || body?.useContext !== undefined || body?.presetName !== undefined) {
    const encSystemPrompt = body?.systemPrompt !== undefined
      ? await encryptNullable(body.systemPrompt, encKey) as string | undefined
      : undefined;
    await updateChatSettings(event, id, body.model, encSystemPrompt, body.vectorStoreId, body.useContext, body.presetName);
  }

  return { success: true };
});
