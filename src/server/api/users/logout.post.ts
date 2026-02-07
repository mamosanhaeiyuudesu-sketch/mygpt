/**
 * POST /api/users/logout - ログアウト
 */
const USER_COOKIE_NAME = 'mygpt_user_id';

export default defineEventHandler(async (event) => {
  // Cookie を削除
  deleteCookie(event, USER_COOKIE_NAME, {
    path: '/'
  });

  return { success: true };
});
