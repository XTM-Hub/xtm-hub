import type { Response } from 'express';
import { logApp } from '../app-logger.util';
import { toError } from './error-guard.util';
import { CustomApolloError } from './error.type';

const isCustomApolloError = (error: unknown): error is CustomApolloError =>
  error instanceof Error &&
  'data' in error &&
  typeof (error as CustomApolloError).data?.http_status === 'number';

/**
 * REST counterpart to mapToGraphQLError/formatError: GraphQL gets its HTTP
 * semantics for free from Apollo Server, which reads a thrown
 * CustomApolloError's `data.http_status`. REST has no equivalent pipeline,
 * so any endpoint that calls into shared App-layer code (including the
 * `Requires*` guard decorators) needs to translate that same error itself.
 * Call this from the endpoint's catch block instead of assuming a generic
 * 500, so a ForbiddenAccess/NotFoundError/... thrown by shared code reaches
 * REST callers with the correct status instead of a genuine unexpected
 * failure.
 */
export const sendAppError = (res: Response, error: unknown): void => {
  if (isCustomApolloError(error)) {
    res.status(error.data.http_status as number).json({
      code: error.data.http_status,
      message: error.message,
    });
    return;
  }

  logApp.error('Unhandled REST error', { error: toError(error) });
  res.status(500).json({ code: 500, message: 'Internal server error' });
};
