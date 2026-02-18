/**
 * GET /api/diary - 日記エントリ一覧取得
 */
import { getAllDiaryEntries } from '~/server/utils/db/diary';
import { getEncryptionKey, decryptIfKey } from '~/server/utils/crypto';
import { requireAuth } from '~/server/utils/auth';

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event);

  const entries = await getAllDiaryEntries(event, userId);
  const encKey = await getEncryptionKey(event);

  return {
    entries: await Promise.all(entries.map(async e => ({
      id: e.id,
      userId: e.user_id,
      title: await decryptIfKey(e.title, encKey),
      sections: await Promise.all(e.sections.map(async s => ({
        id: s.id,
        text: await decryptIfKey(s.text, encKey),
        duration: s.duration,
        completedAt: s.completed_at,
      }))),
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })))
  };
});
