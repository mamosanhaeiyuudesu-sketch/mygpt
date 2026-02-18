/**
 * PATCH /api/chats/:id - チャット設定変更（名前・モデル・システムプロンプト・Vector Store ID）
 */
import { updateChatTitle, updateChatSettings } from '~/server/utils/db/chats';
import { getEncryptionKey, encryptIfKey, encryptNullable } from '~/server/utils/crypto';
import { requireAuth, requireParam, assertChatOwner } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);
  const id = requireParam(event, 'id', 'チャットIDが必要です');
  const body = await readBody(event);

  await assertChatOwner(event, id, userId);

  const encKey = await getEncryptionKey(event);

  // タイトルの更新
  if (body?.name) {
    const encTitle = await encryptIfKey(body.name, encKey);
    await updateChatTitle(event, id, encTitle);
  }

  // モデル・システムプロンプト・Vector Store ID・ペルソナIDの更新
  if (body?.model !== undefined || body?.systemPrompt !== undefined || body?.vectorStoreId !== undefined || body?.useContext !== undefined || body?.personaId !== undefined) {
    // personaId設定時はsystemPrompt/vectorStoreIdをnullにする（動的参照）
    let systemPrompt = body?.systemPrompt;
    let vectorStoreId = body?.vectorStoreId;
    if (body?.personaId) {
      systemPrompt = null;
      vectorStoreId = null;
    }
    const encSystemPrompt = systemPrompt !== undefined
      ? await encryptNullable(systemPrompt, encKey) as string | undefined
      : undefined;
    await updateChatSettings(event, id, body.model, encSystemPrompt, vectorStoreId, body.useContext, body.personaId);
  }

  return { success: true };
});
