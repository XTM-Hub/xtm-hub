import { defaultLocale, publicLocales } from '@/i18n/config';
import { manageRequest } from '@/utils/middleware/graphql-request.util';
import { PUBLIC_CYBERSECURITY_SOLUTIONS_PATH } from '@/utils/path/constant';
import createMiddleware from 'next-intl/middleware';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: publicLocales,
  defaultLocale,
  localePrefix: 'always',
});

const PUBLIC_LOCALE_PATH = new RegExp(
  `^/(${publicLocales.join('|')})(/|$)|^/$`
);
const PUBLIC_CYBERSECURITY_SOLUTION_ROUTE_PATH = new RegExp(
  `^/(${publicLocales.join('|')})/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/[^/]+(?:/[^/]+)?$`,
  'i'
);

export async function proxy(request: NextRequest, _: NextFetchEvent) {
  const proxyResponse = await manageRequest(request);
  if (proxyResponse) {
    return proxyResponse;
  }

  const { pathname } = request.nextUrl;

  const trailingBackslashMatch = pathname.match(/(?:\\|%5c)$/i);
  if (trailingBackslashMatch) {
    const pathnameWithoutTrailingBackslash = pathname.slice(
      0,
      -trailingBackslashMatch[0].length
    );
    if (
      PUBLIC_CYBERSECURITY_SOLUTION_ROUTE_PATH.test(
        pathnameWithoutTrailingBackslash
      ) &&
      !/(\\|%5c)/i.test(pathnameWithoutTrailingBackslash)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = pathnameWithoutTrailingBackslash;
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  if (PUBLIC_LOCALE_PATH.test(pathname) || !pathname.startsWith('/app')) {
    return intlMiddleware(request);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    'x-pathname',
    request.nextUrl.pathname + request.nextUrl.search
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/',
    '/(en|ja)/:path*',
    '/cybersecurity-solutions',
    '/cybersecurity-solutions/:path*',
    '/graphql-api',
    '/graphql-sse',
    '/auth/:path*',
    '/document/get/:filename*',
    '/document/visualize/:serviceInstanceId/:filename*',
    '/document/deploy/:serviceInstanceId/:filename*',
    '/document/images/:documentId*',
    '/user/picture/:userId*',
    '/app/:path*',
    '/api/chatbot/:path*',
    '/:product/:version/:integrationType/manifests',
    '/:product/:version/:integrationType/manifests/:path*',
    '/:product/versions-matrix',
  ],
};
