'use server';
import { isContentEditor } from '@/utils/content-translation/content-edit-mode.server';
import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { cookies } from 'next/headers';

/**
 * Anyone can call a Server Action, so turning edit mode on re-checks the
 * BYPASS capability. The cookie is httpOnly: only the server reads it.
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
