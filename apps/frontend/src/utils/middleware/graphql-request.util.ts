import { NextRequest, NextResponse } from 'next/server';

export const GRAPHQL_API = '/graphql-api';
export const GRAPHQL_SSE = '/graphql-sse';
export const SERVER_HTTP_API =
  process.env.SERVER_HTTP_API ?? 'http://localhost:4002';
const MANIFEST_PATH = /^\/[^/]+\/[^/]+\/[^/]+\/manifests(?:\/|$)/;
const VERSIONS_MATRIX_PATH = /^\/[^/]+\/versions-matrix(?:\/|$)/;

export const manageRequest = async (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith(GRAPHQL_API)) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + GRAPHQL_API, request.url)
    );
  }
  if (pathname.startsWith(GRAPHQL_SSE)) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + GRAPHQL_SSE, request.url)
    );
  }

  if (pathname.startsWith('/auth')) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + pathname + search, request.url)
    );
  }

  if (pathname.startsWith('/document')) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + pathname + search, request.url)
    );
  }
  if (pathname.startsWith('/user/picture')) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + pathname + search, request.url)
    );
  }
  if (MANIFEST_PATH.test(pathname)) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + pathname + search, request.url)
    );
  }
  if (VERSIONS_MATRIX_PATH.test(pathname)) {
    return NextResponse.rewrite(
      new URL(SERVER_HTTP_API + pathname + search, request.url)
    );
  }
  return undefined;
};
