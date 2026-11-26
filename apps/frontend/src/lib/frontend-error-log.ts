import { portalGraphqlClient } from '@/lib/graphql-client';
import { useFrontendErrorLogMutation } from '@graphql/generated';

/**
 * Sends an error to the API logs. Callers need not wait: the promise always
 * resolves, a report that fails is dropped, never rethrown.
 */
export const logFrontendError = (
  message: string,
  codeStack?: string | null,
  componentStack?: string | null
): Promise<void> =>
  useFrontendErrorLogMutation
    .fetcher(portalGraphqlClient, {
      message,
      codeStack: codeStack ?? null,
      componentStack: componentStack ?? null,
    })()
    .then(
      () => undefined,
      () => undefined
    );
