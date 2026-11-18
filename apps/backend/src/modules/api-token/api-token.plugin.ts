import { ApolloServerPlugin } from '@apollo/server';
import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { ApiTokenScope } from '../../__generated__/resolvers-types';
import { Context } from '../../server/apollo-plugins/log';
import { logApp } from '../../utils/app-logger.util';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { getApiTokenAuthentication } from './api-token.auth';

// Operations a token never runs, whatever its scope: they change the identity or the credentials of the caller
export const API_TOKEN_DENIED_FIELDS: ReadonlySet<string> = new Set([
  'changeSelectedOrganization',
  'createApiToken',
  'logout',
]);

const API_TOKEN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const API_TOKEN_RATE_LIMIT = 300;

/**
 * Per token, not per IP: one token cannot starve the others behind the same proxy. A request without a token is not
 * counted here.
 */
export const apiTokenRateLimiter = rateLimit({
  windowMs: API_TOKEN_RATE_LIMIT_WINDOW_MS,
  limit: API_TOKEN_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req: Request) => !getApiTokenAuthentication(req),
  keyGenerator: (req: Request) =>
    `api-token:${getApiTokenAuthentication(req)?.token.id ?? ''}`,
  handler: (req: Request, res: Response) => {
    logApp.warn('[RATE-LIMIT] API token rate limited', {
      api_token_id: getApiTokenAuthentication(req)?.token.id,
    });
    res.status(429).json({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
  },
});

/**
 * The scope of a token is enforced on the operation, before any resolver: a read token runs no mutation, and no token
 * runs the operations of API_TOKEN_DENIED_FIELDS. One audit line per call names the token and the operation.
 */
export const apiTokenPlugin: ApolloServerPlugin<Context> = {
  async requestDidStart({ contextValue }) {
    const authentication = getApiTokenAuthentication(contextValue.req);
    if (!authentication) {
      return {};
    }
    return {
      async didResolveOperation({ operation, operationName }) {
        if (!operation) {
          throw mapToGraphQLError(ForbiddenErrorCode.ForbiddenAccess);
        }
        const fields = operation.selectionSet.selections.flatMap((selection) =>
          selection.kind === 'Field' ? [selection.name.value] : []
        );
        logApp.info('API token call', {
          api_token_id: authentication.token.id,
          user_id: authentication.user.id,
          organization_id: authentication.token.organization_id,
          operation_type: operation.operation,
          operation_name: operationName ?? null,
          fields,
        });
        if (operation.operation !== 'mutation') {
          return;
        }
        if (fields.some((field) => API_TOKEN_DENIED_FIELDS.has(field))) {
          throw mapToGraphQLError(ForbiddenErrorCode.NotAllowedWithApiToken);
        }
        if (authentication.token.scope === ApiTokenScope.Read) {
          throw mapToGraphQLError(ForbiddenErrorCode.ReadOnlyApiToken);
        }
      },
    };
  },
};
