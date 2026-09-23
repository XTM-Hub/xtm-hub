import { EDIT_MODE_COOKIE_NAME } from '@/utils/edit-mode-cookie';
import { loadMeUser } from '@/utils/load-me-user';
import { buildLoginRedirect, isSafeRedirect } from '@/utils/redirect';
import { loadBaseUrlFront } from '@app/redirect/[identifier]/utils/load';
import { PortalCapability } from '@graphql/generated';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Visiting /edition turns global edit mode on: it sets the edit-mode cookie
// and redirects back to wherever the caller wants. Only BYPASS users get the
// cookie, and every render re-checks the capability anyway (see
// isContentEditModeActive), since a cookie can be forged.
//
// Redirects are built from the configured base_url_front (not request.url):
// behind a reverse proxy/ingress, the Host Next.js sees for its own request
// object can be the internal bind address rather than the public host.
export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const destination =
    redirectParam && isSafeRedirect(redirectParam) ? redirectParam : '/';
  const baseUrlFront = await loadBaseUrlFront();

  const me = await loadMeUser();
  if (!me) {
    // Route back through /edition itself (not straight to `destination`)
    // once login succeeds, so the cookie still gets set — otherwise a
    // visitor who wasn't already logged in when hitting /edition would end
    // up on `destination` with edit mode silently never turned on.
    const selfUrl = `/edition?redirect=${encodeURIComponent(destination)}`;
    return NextResponse.redirect(
      new URL(buildLoginRedirect(selfUrl), baseUrlFront)
    );
  }

  const canEditContent = me.capabilities?.some(
    (capability) => capability.name === PortalCapability.Bypass
  );
  if (!canEditContent) {
    return NextResponse.redirect(new URL(destination, baseUrlFront));
  }

  const response = NextResponse.redirect(new URL(destination, baseUrlFront));
  response.cookies.set(EDIT_MODE_COOKIE_NAME, '1', {
    path: '/',
    sameSite: 'lax',
  });
  return response;
}
