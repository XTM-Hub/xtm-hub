import { resolveGraphqlApiEndpoint } from '@/lib/graphql-client';
import {
  extractOperationName,
  extractOperationType,
  resolveActiveCacheConfig,
  scrubSensitiveVariables,
  throwOnGraphqlErrors,
} from '@/lib/graphql-fetch.utils';
import { isDevelopment } from '@/lib/utils';

export type ServerGraphqlFetchOptions = {
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

// Uses Next.js's global `fetch` directly (unlike graphql-request, which
// bypasses it) so `cache` / `next.revalidate` are honored.
export async function serverGraphqlFetch<
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  document: string,
  variables?: TVariables,
  options: ServerGraphqlFetchOptions = {}
): Promise<TData> {
  const apiUri = resolveGraphqlApiEndpoint();

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.log(
      `[GraphQL:Server ${extractOperationType(document)}] ${extractOperationName(document)} -> ${apiUri}`,
      { variables: scrubSensitiveVariables(variables ?? {}) }
    );
  }

  const response = await fetch(apiUri, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: document, variables }),
    ...resolveActiveCacheConfig(options),
  });

  const json = (await response.json()) as {
    data?: TData;
    errors?: { message: string; extensions?: { code?: string } }[];
  };

  throwOnGraphqlErrors(json.errors);

  return json.data as TData;
}
