import {
  buildCookieHeader,
  extractOperationType,
  prepareUri,
  resolveActiveCacheConfig,
  scrubSensitiveVariables,
  throwOnGraphqlErrors,
} from '@/lib/graphql-fetch.utils';
import { isDevelopment } from '@/lib/utils';
import { createClient } from 'graphql-sse';
import {
  GraphQLResponse,
  Observable,
  RequestParameters,
  Variables,
} from 'relay-runtime';

export function getGraphqlApi(serverSide: boolean, type: 'sse' | 'api') {
  if (serverSide) {
    return prepareUri(process.env.SERVER_HTTP_API) + ('graphql-' + type);
  } else {
    return (
      prepareUri(process.env.NEXT_PUBLIC_CLIENT_HTTP_API) + ('graphql-' + type)
    );
  }
}

export async function networkFetch({
  apiUri = '/graphql-api',
  request,
  variables,
  cookieList,
  cache,
  options = {},
}: {
  apiUri?: string;
  request: RequestParameters;
  variables: Variables;
  cookieList?: { name: string; value: string }[];
  cache?: RequestCache;
  options?: RequestInit;
}): Promise<GraphQLResponse> {
  const cacheConfig = Boolean(options.cache) ? options.cache : cache;
  if (isDevelopment()) {
    logGraphQLOperation(request, variables, apiUri, cacheConfig);
  }

  const headers: { [k: string]: string } = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const cookieHeader = buildCookieHeader(cookieList);
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const resp = await fetch(apiUri, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: JSON.stringify({
      query: request.text,
      variables,
      operationName: request.name,
    }),
    ...resolveActiveCacheConfig({ ...options, cache: cacheConfig }),
  });
  const json = await resp.json();
  throwOnGraphqlErrors(json.errors);
  return json;
}

const subscriptionsClient = createClient({
  url: '/graphql-sse',
  singleConnection: true,
});

export function fetchOrSubscribe(
  operation: RequestParameters,
  variables: Variables
): Observable<never> {
  return Observable.create((sink) => {
    if (!operation.text) {
      return sink.error(new Error('Operation text cannot be empty'));
    }
    return subscriptionsClient.subscribe(
      {
        operationName: operation.name,
        query: operation.text,
        variables,
      },
      sink
    );
  });
}

export function logGraphQLOperation(
  request: RequestParameters,
  variables: Variables,
  apiUri: string,
  cache?: RequestCache
) {
  const operationName = request.name || 'Anonymous';
  const operationType = extractOperationType(request.text || '');
  // eslint-disable-next-line no-console
  console.log(`[GraphQL:Relay ${operationType}] ${operationName} → ${apiUri}`, {
    variables: scrubSensitiveVariables(variables ?? {}),
    cache: cache ?? 'auto (default)',
  });
}
