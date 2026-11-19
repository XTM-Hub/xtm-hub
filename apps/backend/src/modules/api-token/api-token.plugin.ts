import { ApolloServerPlugin } from '@apollo/server';
import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  type DocumentNode,
  type FragmentDefinitionNode,
  Kind,
  type OperationDefinitionNode,
  type SelectionSetNode,
} from 'graphql';
import {
  ApiTokenScope,
  type Mutation,
} from '../../__generated__/resolvers-types';
import { Context } from '../../server/apollo-plugins/log';
import { logApp } from '../../utils/app-logger.util';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { getApiTokenAuthentication } from './api-token.auth';

/**
 * Mutations a token never runs, whatever its scope: they act on the caller's own account, credentials, profile,
 * personal space or sessions, or issue a credential that would outlive the token (`refreshUserPlatformToken`,
 * `registerPlatform`).
 * `revokeApiToken` stays allowed: revoking with a token only ever reduces access. Add here any new mutation of that
 * kind. Typed with the generated Mutation fields: a misspelled or renamed field does not compile.
 */
type MutationField = Exclude<keyof Mutation, '__typename'>;

export const API_TOKEN_DENIED_FIELDS: ReadonlySet<string> =
  new Set<MutationField>([
    // Organization and sessions
    'changeSelectedOrganization',
    'login',
    'logout',
    // Credentials
    'createApiToken',
    'refreshUserPlatformToken',
    'registerPlatform',
    'resetPassword',
    // Profile and personal space
    'editMeUser',
    'uploadUserPicture',
    'requestTransferPersonalSpace',
    'transferPersonalSpace',
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
 * The root fields an operation runs, fragments included: `mutation { ...F } fragment F on Mutation { logout }` runs
 * logout as surely as `mutation { logout }`.
 */
export const operationRootFields = (
  operation: OperationDefinitionNode,
  document: DocumentNode
): string[] => {
  const fragments = new Map<string, FragmentDefinitionNode>(
    document.definitions.flatMap((definition) =>
      definition.kind === Kind.FRAGMENT_DEFINITION
        ? [[definition.name.value, definition] as const]
        : []
    )
  );
  const visited = new Set<string>();
  const collect = (selectionSet: SelectionSetNode): string[] =>
    selectionSet.selections.flatMap((selection) => {
      if (selection.kind === Kind.FIELD) {
        return [selection.name.value];
      }
      if (selection.kind === Kind.INLINE_FRAGMENT) {
        return collect(selection.selectionSet);
      }
      const fragment = fragments.get(selection.name.value);
      if (!fragment || visited.has(selection.name.value)) {
        return [];
      }
      visited.add(selection.name.value);
      return collect(fragment.selectionSet);
    });
  return collect(operation.selectionSet);
};

// Why a token of this scope may not run this operation, or null when it may
export const apiTokenOperationRefusal = (
  scope: ApiTokenScope,
  operationType: OperationDefinitionNode['operation'],
  fields: string[]
): ForbiddenErrorCode | null => {
  if (operationType !== 'mutation') {
    return null;
  }
  if (fields.some((field) => API_TOKEN_DENIED_FIELDS.has(field))) {
    return ForbiddenErrorCode.NotAllowedWithApiToken;
  }
  if (scope === ApiTokenScope.Read) {
    return ForbiddenErrorCode.ReadOnlyApiToken;
  }
  return null;
};

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
      async didResolveOperation({ operation, operationName, document }) {
        if (!operation) {
          throw mapToGraphQLError(ForbiddenErrorCode.ForbiddenAccess);
        }
        const fields = operationRootFields(operation, document);
        logApp.info('API token call', {
          api_token_id: authentication.token.id,
          user_id: authentication.user.id,
          organization_id: authentication.token.organization_id,
          operation_type: operation.operation,
          operation_name: operationName ?? null,
          fields,
        });
        const refusal = apiTokenOperationRefusal(
          authentication.token.scope,
          operation.operation,
          fields
        );
        if (refusal) {
          throw mapToGraphQLError(refusal);
        }
      },
    };
  },
};
