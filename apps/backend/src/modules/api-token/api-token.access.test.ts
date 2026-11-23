import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { ApiTokenScope } from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { ErrorType } from '../../utils/error/error.type';
import { ApiTokenApp } from './api-token.app';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';

const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN;
const SECOND = TEST_ORGANIZATIONS.SECOND_ORGANIZATION;

// The token rows are tokens of ADMIN_ORGA, who administers SECOND ORGA, except tokenOtherOrganization, a read_write
// token of SIMPLE2 for Filigran. A read token is refused any mutation first, whatever the guard says

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiTokens query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query { apiTokens { name } }`,
    guarded: () => vi.spyOn(ApiTokenApp, 'listOwn').mockResolvedValue([]),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: 'allowed',
      tokenRead: 'allowed',
      tokenReadWrite: 'allowed',
      tokenAdmin: 'allowed',
      tokenOtherOrganization: 'allowed',
    },
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { apiTokens: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('organizationApiTokens query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query { organizationApiTokens { name } }`,
    guarded: () =>
      vi.spyOn(ApiTokenApp, 'listOrganization').mockResolvedValue([]),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      admin: 'allowed',
      memberWithoutCapability:
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
      otherOrganization: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      nonMember: NotFoundErrorCode.NotFound,
      // A token keeps the organization capabilities of its user for the admin scope only
      tokenRead: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      tokenReadWrite: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      tokenAdmin: 'allowed',
      tokenOtherOrganization:
        ForbiddenErrorCode.MissingCapabilityOnOrganization,
    },
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { organizationApiTokens: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('currentApiToken query', () => {
  // Not a matrix: the function behind it is only called for a token, a session answers null
  const operation = `query { currentApiToken { id scope organization_id } }`;
  const executeAs = TestHelper.useGraphqlAs();
  const executeAsToken = TestHelper.useGraphqlAsToken();

  it('should refuse an anonymous visitor with UNAUTHENTICATED', async () => {
    // When
    const { errors } = await executeAs('anonymous', operation, {});

    // Then
    expect(errors).toMatchObject([
      {
        message: UnauthenticatedErrorCode.Unauthenticated,
        extensions: { code: ErrorType.Unauthenticated },
      },
    ]);
  });

  it('should answer null to a session', async () => {
    // When
    const { data, errors } = await executeAs('user', operation, {});

    // Then
    expect(errors).toBeUndefined();
    expect(data).toEqual({ currentApiToken: null });
  });

  it.each([
    {
      scope: ApiTokenScope.Read,
      userId: SECOND.USERS.ADMIN_ORGA.ID,
      organizationId: SECOND.ID,
    },
    {
      scope: ApiTokenScope.ReadWrite,
      userId: FILIGRAN.USERS.SIMPLE2.ID,
      organizationId: FILIGRAN.ID,
    },
    {
      scope: ApiTokenScope.Admin,
      userId: SECOND.USERS.ADMIN_ORGA.ID,
      organizationId: SECOND.ID,
    },
  ])(
    'should answer a $scope token its own token',
    async ({ scope, userId, organizationId }) => {
      // Given
      const sent = await TestHelper.apiToken.send({
        userId,
        organizationId,
        scope,
      });

      try {
        // When
        const { data, errors } = await executeAsToken(sent, operation, {});

        // Then
        expect(errors).toBeUndefined();
        expect(data).toEqual({
          currentApiToken: {
            id: sent.tokenId,
            scope,
            organization_id: organizationId,
          },
        });
      } finally {
        await sent.cleanup();
      }
    }
  );
});

describe('createApiToken mutation', () => {
  const created: { token: string; api_token: ApiTokenWithNames } = {
    token: 'xhp_created-secret',
    api_token: {
      id: 'f7a1c0de-0000-4000-8000-000000000002' as ApiTokenId,
      user_id: FILIGRAN.USERS.SIMPLE2.ID,
      organization_id: FILIGRAN.ID,
      name: 'Copilot',
      token_prefix: 'xhp_created',
      token_hash: 'never exposed',
      scope: ApiTokenScope.ReadWrite,
      expires_at: new Date('2027-01-01T00:00:00Z'),
      last_used_at: null,
      created_at: new Date('2026-11-18T00:00:00Z'),
      revoked_at: null,
      organization_name: FILIGRAN.NAME,
      user_email: FILIGRAN.USERS.SIMPLE2.EMAIL,
    },
  };

  // The organization of the request is the one named, not the selected one: nonMember belongs to Filigran. The BYPASS
  // row is no member of it and passes no better than anyone else. A token never creates a token, scope aside
  TestHelper.expectAccessMatrix({
    operation: `mutation ($input: CreateApiTokenInput!) {
      createApiToken(input: $input) { token api_token { name organization_id } }
    }`,
    guarded: () => vi.spyOn(ApiTokenApp, 'create').mockResolvedValue(created),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: 'allowed',
      admin: NotFoundErrorCode.NotFound,
      memberWithoutCapability: 'allowed',
      otherOrganization: NotFoundErrorCode.NotFound,
      nonMember: 'allowed',
      tokenRead: ForbiddenErrorCode.ReadOnlyApiToken,
      tokenReadWrite: ForbiddenErrorCode.NotAllowedWithApiToken,
      tokenAdmin: ForbiddenErrorCode.NotAllowedWithApiToken,
      tokenOtherOrganization: ForbiddenErrorCode.NotAllowedWithApiToken,
    },
    prepare: () =>
      Promise.resolve({
        variables: {
          input: {
            name: 'Copilot',
            scope: ApiTokenScope.ReadWrite,
            organization_id: FILIGRAN.ID,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        expectedData: {
          createApiToken: {
            token: created.token,
            api_token: { name: 'Copilot', organization_id: FILIGRAN.ID },
          },
        },
        cleanup: () => Promise.resolve(),
      }),
  });
});

describe('revokeApiToken mutation', () => {
  // A token of SECOND ORGA owned by SIMPLE of SECOND ORGA: the otherOrganization row is its owner, tokenAdmin
  // administers its organization, tokenReadWrite belongs to it without administering it, and nobody else is a member
  const prepareToken = async () => {
    const { apiToken, cleanup } = await TestHelper.apiToken.create({
      userId: SECOND.USERS.SIMPLE.ID,
      organizationId: SECOND.ID,
    });
    return { apiToken, cleanup };
  };

  TestHelper.expectAccessMatrix({
    operation: `mutation ($id: ApiTokenId!) { revokeApiToken(id: $id) { id } }`,
    guarded: () => vi.spyOn(ApiTokenApp, 'revoke'),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: NotFoundErrorCode.NotFound,
      admin: NotFoundErrorCode.NotFound,
      memberWithoutCapability: NotFoundErrorCode.NotFound,
      otherOrganization: 'allowed',
      nonMember: NotFoundErrorCode.NotFound,
      tokenRead: ForbiddenErrorCode.ReadOnlyApiToken,
      tokenReadWrite: ForbiddenErrorCode.MissingCapabilityOnOrganization,
      tokenAdmin: 'allowed',
      tokenOtherOrganization: NotFoundErrorCode.NotFound,
    },
    prepare: async () => {
      const { apiToken, cleanup } = await prepareToken();
      return {
        variables: { id: apiToken.id },
        expectedData: {
          revokeApiToken: { id: toGlobalId('ApiToken', apiToken.id) },
        },
        cleanup,
      };
    },
  });

  describe('refusals that leave the token active', () => {
    const operation = `mutation ($id: ApiTokenId!) { revokeApiToken(id: $id) { id } }`;
    const executeAs = TestHelper.useGraphqlAs();
    const executeAsToken = TestHelper.useGraphqlAsToken();

    const expectNotFound = (errors: unknown) =>
      expect(errors).toMatchObject([
        {
          message: NotFoundErrorCode.NotFound,
          extensions: { code: ErrorType.NotFound },
        },
      ]);

    const expectActive = async (id: ApiTokenId) =>
      expect(await ApiTokenDomain.loadById(id)).toMatchObject({
        id,
        revoked_at: null,
      });

    it('should answer NOT_FOUND for an unknown token', async () => {
      // Given
      const revoke = vi.spyOn(ApiTokenApp, 'revoke');

      // When
      const { errors } = await executeAs('user', operation, { id: uuidv4() });

      // Then
      expectNotFound(errors);
      expect(revoke).not.toHaveBeenCalled();
    });

    it('should answer NOT_FOUND without a database error for an id that is not a uuid', async () => {
      // Given
      const revoke = vi.spyOn(ApiTokenApp, 'revoke');
      const loadById = vi.spyOn(ApiTokenDomain, 'loadById');

      // When
      const { errors } = await executeAs('otherOrganization', operation, {
        id: 'not-a-uuid',
      });

      // Then
      expectNotFound(errors);
      expect(loadById).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
    });

    it('should answer NOT_FOUND to the owner who left the organization of the token', async () => {
      // Given SIMPLE of SECOND ORGA, who owns a token of Filigran, which they do not belong to
      const { apiToken, cleanup } = await TestHelper.apiToken.create({
        userId: SECOND.USERS.SIMPLE.ID,
        organizationId: FILIGRAN.ID,
      });

      try {
        // When
        const { errors } = await executeAs('otherOrganization', operation, {
          id: apiToken.id,
        });

        // Then
        expectNotFound(errors);
        await expectActive(apiToken.id);
      } finally {
        await cleanup();
      }
    });

    it('should answer NOT_FOUND to a token of an organization revoking the token its user owns in another organization', async () => {
      // Given the token of ADMIN_ORGA for SECOND ORGA, and the token of the same user for their personal space
      const { apiToken, cleanup } = await TestHelper.apiToken.create({
        userId: SECOND.USERS.ADMIN_ORGA.ID,
        organizationId: SECOND.USERS.ADMIN_ORGA.PERSONAL_SPACE_ID,
      });
      const sent = await TestHelper.apiToken.send({
        userId: SECOND.USERS.ADMIN_ORGA.ID,
        organizationId: SECOND.ID,
        scope: ApiTokenScope.Admin,
      });

      try {
        // When
        const { errors } = await executeAsToken(sent, operation, {
          id: apiToken.id,
        });

        // Then
        expectNotFound(errors);
        await expectActive(apiToken.id);
      } finally {
        await sent.cleanup();
        await cleanup();
      }
    });
  });
});
