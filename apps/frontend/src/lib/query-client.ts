import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { redirectToLogin } from '@/utils/redirect';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

// Mirrors react-query's default, which a custom `retry` function replaces.
const MAX_QUERY_RETRIES = 3;

// Never settles, so a mutation's own onError (an error snackbar) does not run during the redirect.
const redirectOnUnauthenticated = (
  error: Error
): Promise<never> | undefined => {
  if (!(error instanceof UnauthenticatedError)) return undefined;

  redirectToLogin();
  return new Promise<never>(() => {});
};

// Retrying cannot bring an expired session back, it only delays the redirect.
const retryUnlessUnauthenticated = (failureCount: number, error: Error) =>
  !(error instanceof UnauthenticatedError) && failureCount < MAX_QUERY_RETRIES;

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({ onError: redirectOnUnauthenticated }),
    mutationCache: new MutationCache({ onError: redirectOnUnauthenticated }),
    defaultOptions: {
      queries: { retry: retryUnlessUnauthenticated },
    },
  });
