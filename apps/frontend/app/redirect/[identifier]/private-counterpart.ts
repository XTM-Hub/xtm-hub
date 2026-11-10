import { APP_PATH } from '@/utils/path/constant';
import { resolvePrivatePath } from '@/utils/path/public-to-private';
import { isSafeRedirect } from '@/utils/redirect';
import { NextRequest, NextResponse } from 'next/server';
import { loadBaseUrlFront } from './utils/load';

/**
 * After sign-in, sends the user from a public page to its private counterpart,
 * or to the app home when it has none or cannot be resolved.
 */
export const redirectToPrivateCounterpart = async (request: NextRequest) => {
  const baseUrlFront = await loadBaseUrlFront();
  const appHome = `/${APP_PATH}`;
  const path = request.nextUrl.searchParams.get('path');

  const privatePath =
    path && isSafeRedirect(path)
      ? await resolvePrivatePath(path).catch(() => null)
      : null;

  return NextResponse.redirect(new URL(privatePath ?? appHome, baseUrlFront));
};
