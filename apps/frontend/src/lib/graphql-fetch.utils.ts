import { isDevelopment } from '@/lib/utils';
import { Variables } from 'relay-runtime';

export const SENSITIVE_FIELD_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
]);

export function scrubSensitiveVariables(variables: Variables): Variables {
  if (!variables || typeof variables !== 'object') return variables;
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => {
      if (SENSITIVE_FIELD_KEYS.has(key)) return [key, '[HIDDEN]'];
      if (Array.isArray(value)) {
        return [
          key,
          value.map((item) =>
            item !== null && typeof item === 'object'
              ? scrubSensitiveVariables(item as Variables)
              : item
          ),
        ];
      }
      if (value !== null && typeof value === 'object')
        return [key, scrubSensitiveVariables(value as Variables)];
      return [key, value];
    })
  );
}

export function buildCookieHeader(
  cookieList?: { name: string; value: string }[]
): string | undefined {
  if (!cookieList?.length) return undefined;
  return cookieList.map((ck) => `${ck.name}=${ck.value}`).join('; ');
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('UNAUTHENTICATED');
    this.name = 'UnauthenticatedError';
  }
}

/** Keeps the API's `extensions.code`, when it sends one, beside its message. */
export class GraphqlRequestError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GraphqlRequestError';
    this.code = code;
  }
}

export type GraphqlErrorLike = {
  message: string;
  extensions?: { code?: string };
};

/**
 * Throws UnauthenticatedError on an UNAUTHENTICATED error code, otherwise
 * throws a GraphqlRequestError with the first error's message and code.
 */
export function throwOnGraphqlErrors(errors?: GraphqlErrorLike[]): void {
  if (!Array.isArray(errors) || errors.length === 0) return;

  const unauthenticatedError = errors.find(
    (graphqlError) => graphqlError.extensions?.code === 'UNAUTHENTICATED'
  );
  if (unauthenticatedError) {
    throw new UnauthenticatedError();
  }

  const [firstError] = errors;
  throw new GraphqlRequestError(
    firstError?.message ?? 'GraphQL request failed',
    firstError?.extensions?.code
  );
}

export function prepareUri(uri: string | undefined): string {
  if (uri) {
    return uri.endsWith('/') ? uri : uri + '/';
  }
  return 'http://localhost:4002/';
}

type FetchCacheOptions = {
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

/**
 * Returns a copy of `options` with `no-store` forced in development so devs
 * always see fresh data, and without `next.revalidate` when the cache ends up
 * as `no-store` (Next.js throws if both are set). `options` is left untouched.
 */
export function resolveActiveCacheConfig<TOptions extends FetchCacheOptions>(
  options: TOptions
): TOptions {
  const cache = isDevelopment() ? 'no-store' : options.cache;

  if (cache !== 'no-store' || options.next?.revalidate === undefined) {
    return { ...options, cache };
  }

  const { revalidate: _revalidate, ...next } = options.next;
  return { ...options, cache, next };
}

export function extractOperationType(query: string): string {
  return (
    query
      .trim()
      .match(/^(query|mutation|subscription)/i)?.[1]
      ?.toUpperCase() || 'QUERY'
  );
}

export function extractOperationName(query: string): string {
  return (
    query.trim().match(/^(?:query|mutation|subscription)\s+(\w+)/)?.[1] ??
    'Anonymous'
  );
}
