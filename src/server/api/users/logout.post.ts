/**
 * POST /api/users/logout - ログアウト
 */
import { USER_COOKIE_NAME } from '~/server/utils/constants';

export default defineEventHandler(async (event) => {
  // Cookie を削除
  deleteCookie(event, USER_COOKIE_NAME, {
    path: '/'
  });

  return { success: true };
});
