import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { isSafeRedirect } from '@/utils/redirect';
import { loadBaseUrlFront } from '@app/redirect/[identifier]/utils/load';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Visiting /edition/exit turns global edit mode off: clears the cookie and
// redirects back to wherever the caller came from. See app/edition/route.ts
// for why the redirect is built from base_url_front rather than request.url.
export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const destination =
    redirectParam && isSafeRedirect(redirectParam) ? redirectParam : '/';
  const baseUrlFront = await loadBaseUrlFront();

  const response = NextResponse.redirect(new URL(destination, baseUrlFront));
  response.cookies.delete(EDIT_MODE_COOKIE_NAME);
  return response;
}
