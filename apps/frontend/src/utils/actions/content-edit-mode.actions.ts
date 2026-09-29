'use server';
import { isContentEditor } from '@/utils/content-translation/content-edit-mode.server';
import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { cookies } from 'next/headers';

/**
 * Turns in-context content editing on or off for the current browser.
 * Turning it on is restricted to BYPASS users: anyone can call a Server
 * Action. The cookie is httpOnly since edit mode is always resolved on the
 * server (see isContentEditModeActive).
 */
export default async function setContentEditModeAction(isEnabled: boolean) {
  const cookieStore = await cookies();
  if (!isEnabled) {
    cookieStore.delete(EDIT_MODE_COOKIE_NAME);
    return;
  }
  if (await isContentEditor()) {
    cookieStore.set(EDIT_MODE_COOKIE_NAME, '1', {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    });
  }
}
