import type { GraphQLRequestContextDidResolveOperation } from '@apollo/server';
import { Kind, type OperationDefinitionNode, parse } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  contextAdminSecondOrga,
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import { ApiTokenScope } from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { Context } from '../../server/apollo-plugins/log';
import { ForbiddenErrorCode } from '../../utils/error/error.code';
import { ApiTokenApp } from './api-token.app';
import {
  type ApiTokenAuthentication,
  getApiTokenAuthentication,
} from './api-token.auth';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';
import { apiTokenPlugin } from './api-token.plugin';
import resolver from './api-token.resolver';

vi.mock('./api-token.auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api-token.auth')>()),
  getApiTokenAuthentication: vi.fn(),
}));

const TOKEN_ID = 'f7a1c0de-0000-4000-8000-000000000001' as ApiTokenId;
const ORGANIZATION = TEST_ORGANIZATIONS.FILIGRAN;

const stored: ApiTokenWithNames = {
  id: TOKEN_ID,
  user_id: ORGANIZATION.USERS.SIMPLE2.ID,
  organization_id: ORGANIZATION.ID,
  name: 'Copilot',
  token_prefix: 'xhp_abcdef',
  token_hash: 'hash never exposed',
  scope: ApiTokenScope.ReadWrite,
  expires_at: new Date('2027-01-01T00:00:00Z'),
  last_used_at: null,
  created_at: new Date('2026-11-18T00:00:00Z'),
  revoked_at: null,
  organization_name: ORGANIZATION.NAME,
  user_email: ORGANIZATION.USERS.SIMPLE2.EMAIL,
} as ApiTokenWithNames;

const authentication = (scope: ApiTokenScope): ApiTokenAuthentication =>
  ({
    token: {
      id: TOKEN_ID,
      name: stored.name,
      scope,
      organization_id: ORGANIZATION.ID,
      expires_at: stored.expires_at,
    },
    user: contextSimpleUserFiligran2.user,
  }) as ApiTokenAuthentication;

// What the API answers: never the hash, never the owner id
const exposed = {
  id: stored.id,
  name: stored.name,
  token_prefix: stored.token_prefix,
  scope: stored.scope,
  organization_id: stored.organization_id,
  organization_name: stored.organization_name,
  user_email: stored.user_email,
  expires_at: stored.expires_at,
  last_used_at: stored.last_used_at,
  created_at: stored.created_at,
  revoked_at: stored.revoked_at,
};

beforeEach(() => {
  vi.mocked(getApiTokenAuthentication).mockReturnValue(undefined);
});

describe('api-token.resolver', () => {
  it('should list the own tokens without their hash', async () => {
    // Given
    vi.spyOn(ApiTokenApp, 'listOwn').mockResolvedValue([stored]);

    // When
    const result = await resolver.Query!.apiTokens!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ApiTokenApp.listOwn).toHaveBeenCalledWith(
      contextSimpleUserFiligran2.user
    );
    expect(result).toEqual([exposed]);
  });

  it('should list the tokens of the selected organization', async () => {
    // Given
    vi.spyOn(ApiTokenApp, 'listOrganization').mockResolvedValue([stored]);

    // When
    const result = await resolver.Query!.organizationApiTokens!(
      {},
      {},
      contextAdminSecondOrga,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual([exposed]);
  });

  it('should answer no current token to a session', async () => {
    const result = await resolver.Query!.currentApiToken!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );
    expect(result).toBeNull();
  });

  it('should answer the token of a token-authenticated request', async () => {
    // Given
    vi.mocked(getApiTokenAuthentication).mockReturnValue(
      authentication(ApiTokenScope.ReadWrite)
    );
    vi.spyOn(ApiTokenDomain, 'loadById').mockResolvedValue(stored);

    // When
    const result = await resolver.Query!.currentApiToken!(
      {},
      {},
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual({
      id: TOKEN_ID,
      name: stored.name,
      scope: stored.scope,
      organization_id: ORGANIZATION.ID,
      organization_name: ORGANIZATION.NAME,
      expires_at: stored.expires_at,
      last_used_at: null,
    });
  });

  it('should answer no current token when the token is gone', async () => {
    // Given
    vi.mocked(getApiTokenAuthentication).mockReturnValue(
      authentication(ApiTokenScope.Read)
    );
    vi.spyOn(ApiTokenDomain, 'loadById').mockResolvedValue(undefined);

    // Then
    expect(
      await resolver.Query!.currentApiToken!(
        {},
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      )
    ).toBeNull();
  });

  it('should create a token and return the secret once', async () => {
    // Given
    vi.spyOn(ApiTokenApp, 'create').mockResolvedValue({
      token: 'xhp_secret',
      api_token: stored,
    });
    const input = {
      name: 'Copilot',
      scope: ApiTokenScope.ReadWrite,
      organization_id: ORGANIZATION.ID,
      expires_at: stored.expires_at,
    };

    // When
    const result = await resolver.Mutation!.createApiToken!(
      {},
      { input },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(ApiTokenApp.create).toHaveBeenCalledWith(
      contextSimpleUserFiligran2.user,
      input
    );
    expect(result).toEqual({ token: 'xhp_secret', api_token: exposed });
  });

  it('should revoke a token', async () => {
    // Given
    const revokedAt = new Date();
    vi.spyOn(ApiTokenApp, 'revoke').mockResolvedValue({
      ...stored,
      revoked_at: revokedAt,
    });

    // When
    const result = await resolver.Mutation!.revokeApiToken!(
      {},
      { id: TOKEN_ID },
      contextSimpleUserFiligran2,
      GRAPHQL_RESOLVE_INFO
    );

    // Then
    expect(result).toEqual({ ...exposed, revoked_at: revokedAt });
  });

  it('should map an application error to a GraphQL error', async () => {
    // Given
    vi.spyOn(ApiTokenApp, 'revoke').mockRejectedValue(
      new Error(ForbiddenErrorCode.MissingCapabilityOnOrganization)
    );

    // Then
    await expect(
      resolver.Mutation!.revokeApiToken!(
        {},
        { id: TOKEN_ID },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      )
    ).rejects.toThrow(ForbiddenErrorCode.MissingCapabilityOnOrganization);
  });
});

describe('apiTokenPlugin', () => {
  const hooksFor = async (scope?: ApiTokenScope) => {
    vi.mocked(getApiTokenAuthentication).mockReturnValue(
      scope ? authentication(scope) : undefined
    );
    return apiTokenPlugin.requestDidStart!({
      contextValue: contextSimpleUserFiligran2,
    } as Parameters<NonNullable<typeof apiTokenPlugin.requestDidStart>>[0]);
  };

  const resolveOperation = async (scope: ApiTokenScope, source: string) => {
    const document = parse(source);
    const operation = document.definitions.find(
      (definition): definition is OperationDefinitionNode =>
        definition.kind === Kind.OPERATION_DEFINITION
    );
    const hooks = await hooksFor(scope);
    return hooks!.didResolveOperation!({
      document,
      operation,
      operationName: operation?.name?.value,
    } as GraphQLRequestContextDidResolveOperation<Context>);
  };

  it('should leave a session request alone', async () => {
    expect(await hooksFor()).toEqual({});
  });

  it('should let a read token run a query', async () => {
    await expect(
      resolveOperation(ApiTokenScope.Read, 'query Me { me { id } }')
    ).resolves.toBeUndefined();
  });

  it('should refuse a mutation to a read token before any resolver', async () => {
    await expect(
      resolveOperation(
        ApiTokenScope.Read,
        'mutation { revokeApiToken(id: "x") { id } }'
      )
    ).rejects.toThrow(ForbiddenErrorCode.ReadOnlyApiToken);
  });

  it('should refuse a denied operation hidden in a fragment to an admin token', async () => {
    await expect(
      resolveOperation(
        ApiTokenScope.Admin,
        'mutation { ...F } fragment F on Mutation { logout }'
      )
    ).rejects.toThrow(ForbiddenErrorCode.NotAllowedWithApiToken);
  });

  it('should refuse a request whose operation is not resolved', async () => {
    const hooks = await hooksFor(ApiTokenScope.Admin);
    await expect(
      hooks!.didResolveOperation!({
        document: parse('query { me { id } }'),
        operation: undefined,
      } as unknown as GraphQLRequestContextDidResolveOperation<Context>)
    ).rejects.toThrow(ForbiddenErrorCode.ForbiddenAccess);
  });
});
