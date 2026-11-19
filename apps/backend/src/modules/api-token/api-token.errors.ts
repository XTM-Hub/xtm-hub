import type { Response } from 'express';
import { UnauthenticatedErrorCode } from '../../utils/error/error.code';

type ApiTokenErrorStatus = 401 | 429;

interface ApiTokenErrorDefinition {
  readonly code: string;
  readonly status: ApiTokenErrorStatus;
}

/**
 * The errors the token middlewares answer themselves, before GraphQL runs, each with its status. Too many requests is
 * not a GraphQL error code: as a `BadRequestErrorCode` a resolver would answer it 400.
 */
export const API_TOKEN_ERRORS = {
  Unauthenticated: {
    code: UnauthenticatedErrorCode.Unauthenticated,
    status: 401,
  },
  TooManyRequests: { code: 'TOO_MANY_REQUESTS', status: 429 },
} as const satisfies Record<string, ApiTokenErrorDefinition>;

type ApiTokenError = (typeof API_TOKEN_ERRORS)[keyof typeof API_TOKEN_ERRORS];

// Same shape as a GraphQL error: an API token client reads JSON, whatever the route and the failure
export const sendApiTokenError = (
  res: Response,
  error: ApiTokenError
): void => {
  res.status(error.status).json({
    errors: [{ message: error.code, extensions: { code: error.code } }],
  });
};
