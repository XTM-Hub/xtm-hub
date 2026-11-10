import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  extractOperationName,
  findOperationName,
  throwOnGraphqlErrors,
  UnauthenticatedError,
} from '@/lib/graphql-fetch.utils';
import { getSseClient } from '@/lib/sse-client';
import { redirectToLogin } from '@/utils/redirect';
import { useFrontendErrorLogMutation } from '@graphql/generated';
import { hashKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

export interface GraphqlSubscriptionOptions<TData> {
  onNext: (data: TData) => void;
  /** Replaces the default report of an error; never called for an expired session. */
  onError?: (error: Error) => void;
  enabled?: boolean;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

const reportError = (operationLabel: string, error: Error) => {
  // A report that fails has nowhere left to go: it is dropped, never rethrown.
  useFrontendErrorLogMutation
    .fetcher(portalGraphqlClient, {
      message: `[GraphQL subscription] ${operationLabel}: ${error.message}`,
      codeStack: error.stack ?? null,
      componentStack: null,
    })()
    .catch(() => {});
};

/**
 * The react-query counterpart of Relay's `useSubscription`: the data is handed
 * to `onNext`, not cached, so the caller updates the react-query cache itself.
 * A transport error only arrives once graphql-sse has given up reconnecting,
 * and the subscription then stays closed until its inputs change.
 */
export const useGraphqlSubscription = <
  TData,
  TVariables extends Record<string, unknown> = Record<string, unknown>,
>(
  document: string,
  variables: TVariables,
  { onNext, onError, enabled = true }: GraphqlSubscriptionOptions<TData>
): void => {
  // Latest callbacks and variables, read by the subscription without
  // resubscribing when only their identity changes.
  const onNextRef = useRef(onNext);
  const onErrorRef = useRef(onError);
  const variablesRef = useRef(variables);
  useEffect(() => {
    onNextRef.current = onNext;
    onErrorRef.current = onError;
    variablesRef.current = variables;
  });

  const variablesHash = hashKey([variables]);

  useEffect(() => {
    if (!enabled) return;

    // Without a name, the API runs the document's only operation.
    const operationName = findOperationName(document);
    const operationLabel = extractOperationName(document);

    const handleError = (error: unknown) => {
      // Same handling as the QueryClient: an expired session goes to the login
      // page, and the caller's own error handling does not run.
      if (error instanceof UnauthenticatedError) {
        redirectToLogin();
        return;
      }
      const normalizedError = toError(error);
      if (!onErrorRef.current) {
        reportError(operationLabel, normalizedError);
        return;
      }
      // Same reason as for onNext below: an exception must never escape the
      // sink, so one thrown by onError is reported, not rethrown.
      try {
        onErrorRef.current(normalizedError);
      } catch (onErrorException) {
        reportError(operationLabel, toError(onErrorException));
      }
    };

    return getSseClient().subscribe<TData>(
      {
        ...(operationName && { operationName }),
        query: document,
        variables: variablesRef.current,
      },
      {
        next: ({ data, errors }) => {
          // An exception escaping this sink would end the subscription in
          // graphql-sse without telling the API, which keeps streaming it.
          try {
            // An expired session arrives as an UNAUTHENTICATED error in an
            // event, after which the API completes the subscription.
            throwOnGraphqlErrors(errors ? [...errors] : undefined);
            if (data) {
              onNextRef.current(data);
            }
          } catch (error) {
            handleError(error);
          }
        },
        error: handleError,
        complete: () => {},
      }
    );
    // variablesHash stands for variablesRef.current, compared by value.
  }, [document, variablesHash, enabled]);
};
