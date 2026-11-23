import type { NextFunction, Request, Response } from 'express';
import { inspect } from 'node:util';
import { describe, expect, it, vi } from 'vitest';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  ApiTokenScope,
  OrganizationCapability,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ApiTokenApp } from './api-token.app';
import {
  apiTokenMiddleware,
  getApiTokenAuthentication,
  resolveApiToken,
} from './api-token.auth';
import { ApiTokenDomain } from './api-token.domain';
import { API_TOKEN_FAILURE_RATE_MAX } from './api-token.failure-limit';
import { ApiTokenHelper } from './api-token.helper';

const SECOND = TEST_ORGANIZATIONS.SECOND_ORGANIZATION;
const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN;
const DAY_MS = 24 * 60 * 60 * 1000;
const INTERNAL_ERROR_BODY = {
  errors: [
    {
      message: 'UNKNOWN_ERROR',
      extensions: { code: 'UNKNOWN_ERROR' },
    },
  ],
};

// What the seeds give FILIGRAN.USERS.SIMPLE2 in Filigran and SECOND.USERS.REGISTERER in the second organization
const SEEDED = {
  MANAGE_ACCESS_SUBSCRIPTION: [
    OrganizationCapability.ManageAccess,
    OrganizationCapability.ManageSubscription,
  ],
  MANAGE_PLATFORMS: [OrganizationCapability.ManagePlatformRegistration],
};

const loadUser = async (id: UserId): Promise<UserLoadUserBy> => {
  const user = (await UserDomain.loadUserBy({
    'User.id': id,
  })) as UserLoadUserBy;
  user.capabilities = await UserDomain.getCapabilities(user.id);
  return user;
};

const createToken = async (
  userId: UserId,
  organizationId: OrganizationId,
  scope: ApiTokenScope
) => {
  const user = await loadUser(userId);
  return ApiTokenApp.create(user, {
    name: `test ${scope}`,
    scope,
    organization_id: organizationId,
    expires_at: new Date(Date.now() + 30 * DAY_MS),
  });
};

// Really disables the user in the database for the time of the callback, so the 401 does not depend on the exact
// message a mocked loadUserBy throws
const withDisabledUser = async (userId: UserId, run: () => Promise<void>) => {
  await UserDomain.updateUser(userId, { disabled: true });
  try {
    await run();
  } finally {
    await UserDomain.updateUser(userId, { disabled: false });
  }
};

const expectRefused = async (secret: string, reason: string, now?: Date) => {
  const resolution = await resolveApiToken(secret, now);
  expect(resolution).toEqual({ authenticated: false, reason });
};

describe('resolveApiToken', () => {
  it('should run a read_write token as its user, pinned to its organization, without any organization capability', async () => {
    // Given
    const { token, api_token } = await createToken(
      SECOND.USERS.ADMIN_ORGA.ID,
      SECOND.ID,
      ApiTokenScope.ReadWrite
    );

    // When
    const resolution = await resolveApiToken(token);

    // Then
    expect(resolution.authenticated).toBe(true);
    if (!resolution.authenticated) return;
    const { user, token: caller } = resolution.authentication;
    expect(caller).toMatchObject({
      id: api_token.id,
      scope: ApiTokenScope.ReadWrite,
      organization_id: SECOND.ID,
    });
    expect(user.id).toBe(SECOND.USERS.ADMIN_ORGA.ID);
    expect(user.selected_organization_id).toBe(SECOND.ID);
    expect(user.organizations.map(({ id }) => id)).toEqual([SECOND.ID]);
    expect(user.selected_org_capabilities).toEqual([]);
    expect(user.capabilities).toEqual([]);
  });

  // Each organization capability administers the organization: none survives a token without the admin scope
  it.each`
    held                                 | userId                        | organizationId | scope
    ${SEEDED.MANAGE_ACCESS_SUBSCRIPTION} | ${FILIGRAN.USERS.SIMPLE2.ID}  | ${FILIGRAN.ID} | ${ApiTokenScope.ReadWrite}
    ${SEEDED.MANAGE_ACCESS_SUBSCRIPTION} | ${FILIGRAN.USERS.SIMPLE2.ID}  | ${FILIGRAN.ID} | ${ApiTokenScope.Read}
    ${SEEDED.MANAGE_PLATFORMS}           | ${SECOND.USERS.REGISTERER.ID} | ${SECOND.ID}   | ${ApiTokenScope.ReadWrite}
    ${SEEDED.MANAGE_PLATFORMS}           | ${SECOND.USERS.REGISTERER.ID} | ${SECOND.ID}   | ${ApiTokenScope.Read}
  `(
    'should give no organization capability to a $scope token of a member holding $held',
    async ({
      held,
      userId,
      organizationId,
      scope,
    }: {
      held: OrganizationCapability[];
      userId: UserId;
      organizationId: OrganizationId;
      scope: ApiTokenScope;
    }) => {
      // Given a member holding exactly these capabilities in the organization
      const member = await loadUser(userId);
      const membership = member.organization_capabilities?.find(
        ({ organization }) => organization.id === organizationId
      );
      expect(new Set(membership?.capabilities)).toEqual(new Set(held));
      const { token } = await createToken(userId, organizationId, scope);

      // When
      const resolution = await resolveApiToken(token);

      // Then
      expect(resolution.authenticated).toBe(true);
      if (!resolution.authenticated) return;
      expect(resolution.authentication.user).toMatchObject({
        id: userId,
        selected_organization_id: organizationId,
        selected_org_capabilities: [],
        organization_capabilities: [
          { organization: { id: organizationId }, capabilities: [] },
        ],
      });
    }
  );

  it('should keep the organization administration of its user with the admin scope', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.ADMIN_ORGA.ID,
      SECOND.ID,
      ApiTokenScope.Admin
    );

    // When
    const resolution = await resolveApiToken(token);

    // Then
    expect(resolution.authenticated).toBe(true);
    if (!resolution.authenticated) return;
    expect(resolution.authentication.user.selected_org_capabilities).toContain(
      OrganizationCapability.AdministrateOrganization
    );
  });

  it('should never give BYPASS nor the platform administrator role, even to an admin token of a platform administrator', async () => {
    // Given
    const { token } = await createToken(
      FILIGRAN.USERS.BYPASS.ID,
      FILIGRAN.ID,
      ApiTokenScope.Admin
    );

    // When
    const resolution = await resolveApiToken(token);

    // Then
    expect(resolution.authenticated).toBe(true);
    if (!resolution.authenticated) return;
    const { user } = resolution.authentication;
    expect(user.capabilities.map(({ name }) => name)).not.toContain(
      PortalCapability.Bypass
    );
    expect(user.roles_portal.map(({ id }) => id)).not.toContain(ROLE_ADMIN.id);
  });

  it('should refuse a malformed or unknown token', async () => {
    await expectRefused('xhp_short', 'malformed');
    await expectRefused(ApiTokenHelper.generate().token, 'unknown');
  });

  it('should refuse a revoked token', async () => {
    // Given
    const { token, api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await ApiTokenDomain.revoke(api_token.id);

    // Then
    await expectRefused(token, 'revoked');
  });

  it('should refuse an expired token', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );

    // Then
    await expectRefused(token, 'expired', new Date(Date.now() + 31 * DAY_MS));
  });

  it('should refuse a token whose user is no longer in its organization', async () => {
    // Given a token of an organization its user does not belong to (a membership that ended)
    const { token, tokenPrefix, tokenHash } = ApiTokenHelper.generate();
    await ApiTokenDomain.insert({
      user_id: FILIGRAN.USERS.BYPASS.ID,
      organization_id: SECOND.ID,
      name: 'membership ended',
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scope: ApiTokenScope.Admin,
      expires_at: new Date(Date.now() + DAY_MS),
    });

    // Then
    await expectRefused(token, 'user not in organization');
  });

  it('should refuse every token of a disabled user at once', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.ReadWrite
    );

    // Then
    await withDisabledUser(SECOND.USERS.SIMPLE.ID, () =>
      expectRefused(token, 'user disabled')
    );
  });

  it('should rethrow an unexpected failure while loading the user instead of refusing the token', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.ReadWrite
    );
    const failure = new Error('relation "User_Organization" does not exist');
    vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValue(failure);

    // Then
    await expect(resolveApiToken(token)).rejects.toBe(failure);
  });
});

describe('apiTokenMiddleware', () => {
  const response = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
      setHeader: vi.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
  };

  // Documentation addresses (RFC 5737), one per test: the refused tokens are counted per IP for the whole file
  const bearerRequest = (ip: string, token: string) =>
    ({ ip, headers: { authorization: `Bearer ${token}` } }) as Request;

  const refuseTokensFrom = async (ip: string, count: number) => {
    for (let index = 0; index < count; index++) {
      await apiTokenMiddleware(
        bearerRequest(ip, ApiTokenHelper.generate().token),
        response() as unknown as Response,
        vi.fn()
      );
    }
  };

  it('should let a request without an API token through unchanged', async () => {
    // Given
    const req = { headers: {} } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(next).toHaveBeenCalledWith();
    expect(getApiTokenAuthentication(req)).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should authenticate the request as the token user and record its use', async () => {
    // Given
    const { token, api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    const touch = vi.spyOn(ApiTokenDomain, 'touchLastUsed');
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const next = vi.fn();

    // When
    await apiTokenMiddleware(
      req,
      response() as unknown as Response,
      next as NextFunction
    );

    // Then
    expect(next).toHaveBeenCalledWith();
    expect(getApiTokenAuthentication(req)?.token.id).toBe(api_token.id);
    expect(getApiTokenAuthentication(req)?.user.id).toBe(
      SECOND.USERS.SIMPLE.ID
    );
    expect(touch).toHaveBeenCalledWith(
      api_token.id,
      expect.any(Date),
      expect.any(Number)
    );
  });

  it.each([
    { elapsedMs: 5 * 1000, recorded: false },
    { elapsedMs: 2 * 60 * 1000, recorded: true },
  ])(
    'should record the use of a token last used $elapsedMs ms ago: $recorded',
    async ({ elapsedMs, recorded }) => {
      // Given
      const { token, api_token } = await createToken(
        SECOND.USERS.SIMPLE.ID,
        SECOND.ID,
        ApiTokenScope.Read
      );
      const lastUsedAt = new Date(Date.now() - elapsedMs);
      await ApiTokenDomain.touchLastUsed(api_token.id, lastUsedAt, 0);
      const touch = vi.spyOn(ApiTokenDomain, 'touchLastUsed');
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;

      // When
      await apiTokenMiddleware(
        req,
        response() as unknown as Response,
        vi.fn() as NextFunction
      );

      // Then
      expect(touch).toHaveBeenCalledTimes(recorded ? 1 : 0);
    }
  );

  it('should write the last use once when the same token is touched at the same time', async () => {
    // Given
    const { api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    const first = new Date();
    const second = new Date(first.getTime() + 1000);

    // When
    await Promise.all([
      ApiTokenDomain.touchLastUsed(api_token.id, first, 60 * 1000),
      ApiTokenDomain.touchLastUsed(api_token.id, second, 60 * 1000),
    ]);

    // Then
    const stored = await ApiTokenDomain.loadById(api_token.id);
    expect([first, second]).toContainEqual(stored?.last_used_at);
    await ApiTokenDomain.touchLastUsed(
      api_token.id,
      new Date(first.getTime() - 5 * 60 * 1000),
      60 * 1000
    );
    expect((await ApiTokenDomain.loadById(api_token.id))?.last_used_at).toEqual(
      stored?.last_used_at
    );
  });

  it('should answer 401 to a refused token, never falling back to a session', async () => {
    // Given
    const req = {
      headers: {
        authorization: `Bearer ${ApiTokenHelper.generate().token}`,
      },
    } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        { message: 'UNAUTHENTICATED', extensions: { code: 'UNAUTHENTICATED' } },
      ],
    });
    expect(next).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)).toBeUndefined();
  });

  it('should answer 429 without looking tokens up once a client has used up its refused tokens', async () => {
    // Given
    const ip = '192.0.2.10';
    const loadByHash = vi.spyOn(ApiTokenDomain, 'loadByHash');
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX);
    const req = bearerRequest(ip, ApiTokenHelper.generate().token);
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(loadByHash).toHaveBeenCalledTimes(API_TOKEN_FAILURE_RATE_MAX);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        {
          message: 'TOO_MANY_REQUESTS',
          extensions: { code: 'TOO_MANY_REQUESTS' },
        },
      ],
    });
    expect(next).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)).toBeUndefined();
  });

  it('should answer 401 to each refused token below the limit', async () => {
    // Given
    const ip = '192.0.2.11';
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX - 1);
    const res = response();

    // When
    await apiTokenMiddleware(
      bearerRequest(ip, ApiTokenHelper.generate().token),
      res as unknown as Response,
      vi.fn()
    );

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should authenticate a valid token while another client is over its limit', async () => {
    // Given
    await refuseTokensFrom('192.0.2.12', API_TOKEN_FAILURE_RATE_MAX + 1);
    const { token, api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    const req = bearerRequest('192.0.2.13', token);
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)?.token).toMatchObject({
      id: api_token.id,
      organization_id: SECOND.ID,
    });
  });

  it('should keep authenticating a token accepted before from a client over its limit', async () => {
    // Given
    const ip = '192.0.2.14';
    const { token, api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await apiTokenMiddleware(
      bearerRequest(ip, token),
      response() as unknown as Response,
      vi.fn()
    );
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX + 1);
    const req = bearerRequest(ip, token);
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)?.token).toMatchObject({
      id: api_token.id,
      organization_id: SECOND.ID,
    });
  });

  it('should still answer 429 without lookup to a token never accepted from a client over its limit', async () => {
    // Given
    const ip = '192.0.2.15';
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await apiTokenMiddleware(
      bearerRequest(ip, token),
      response() as unknown as Response,
      vi.fn()
    );
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX);
    const loadByHash = vi.spyOn(ApiTokenDomain, 'loadByHash');
    const req = bearerRequest(ip, ApiTokenHelper.generate().token);
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(loadByHash).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)).toBeUndefined();
  });

  it('should refuse a token accepted before once revoked, then stop looking it up from a client over its limit', async () => {
    // Given
    const ip = '192.0.2.16';
    const { token, api_token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await apiTokenMiddleware(
      bearerRequest(ip, token),
      response() as unknown as Response,
      vi.fn()
    );
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX);
    await ApiTokenDomain.revoke(api_token.id);
    const loadByHash = vi.spyOn(ApiTokenDomain, 'loadByHash');
    const first = bearerRequest(ip, token);
    const second = bearerRequest(ip, token);
    const firstRes = response();
    const secondRes = response();

    // When
    await apiTokenMiddleware(first, firstRes as unknown as Response, vi.fn());
    await apiTokenMiddleware(second, secondRes as unknown as Response, vi.fn());

    // Then
    expect(loadByHash).toHaveBeenCalledTimes(1);
    expect(getApiTokenAuthentication(first)).toBeUndefined();
    expect(getApiTokenAuthentication(second)).toBeUndefined();
    expect(firstRes.status).toHaveBeenCalledWith(401);
    expect(secondRes.status).toHaveBeenCalledWith(429);
  });

  it('should look up at most the limit of a burst of unknown tokens sent at once', async () => {
    // Given
    const ip = '192.0.2.17';
    const loadByHash = vi.spyOn(ApiTokenDomain, 'loadByHash');
    const responses = Array.from(
      { length: API_TOKEN_FAILURE_RATE_MAX + 10 },
      response
    );

    // When
    await Promise.all(
      responses.map((res) =>
        apiTokenMiddleware(
          bearerRequest(ip, ApiTokenHelper.generate().token),
          res as unknown as Response,
          vi.fn()
        )
      )
    );

    // Then
    expect(loadByHash).toHaveBeenCalledTimes(API_TOKEN_FAILURE_RATE_MAX);
    expect(
      responses.filter((res) => res.status.mock.calls[0]?.[0] === 429)
    ).toHaveLength(10);
  });

  it('should not use up the allowance of a client with the tokens it gets accepted', async () => {
    // Given
    const ip = '192.0.2.18';
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await apiTokenMiddleware(
      bearerRequest(ip, token),
      response() as unknown as Response,
      vi.fn()
    );
    await refuseTokensFrom(ip, API_TOKEN_FAILURE_RATE_MAX - 1);
    const res = response();

    // When
    await apiTokenMiddleware(
      bearerRequest(ip, ApiTokenHelper.generate().token),
      res as unknown as Response,
      vi.fn()
    );

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should not use up the allowance of a client with the calls answered 429 while its valid token was looked up', async () => {
    // Given
    const ip = '192.0.2.20';
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    await Promise.all(
      Array.from({ length: 2 * API_TOKEN_FAILURE_RATE_MAX }, () =>
        apiTokenMiddleware(
          bearerRequest(ip, token),
          response() as unknown as Response,
          vi.fn()
        )
      )
    );
    const res = response();

    // When
    await apiTokenMiddleware(
      bearerRequest(ip, ApiTokenHelper.generate().token),
      res as unknown as Response,
      vi.fn()
    );

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should answer 401 to a token of a disabled user', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    const warn = vi.spyOn(logApp, 'warn');
    const error = vi.spyOn(logApp, 'error');
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await withDisabledUser(SECOND.USERS.SIMPLE.ID, () =>
      apiTokenMiddleware(req, res as unknown as Response, next)
    );

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        { message: 'UNAUTHENTICATED', extensions: { code: 'UNAUTHENTICATED' } },
      ],
    });
    expect(warn).toHaveBeenCalledWith('API token refused', {
      reason: 'user disabled',
    });
    expect(error).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(getApiTokenAuthentication(req)).toBeUndefined();
  });

  it('should log an unexpected failure while loading the user once and answer 500, never 401', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    // A knex error embeds the query bindings: here the hash of the token the lookup was made with
    const failure = new Error(
      `select "ApiToken".* from "ApiToken" where "token_hash" = '${ApiTokenHelper.hash(token)}' - relation "User_Organization" does not exist`
    );
    vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValue(failure);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => {});
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(INTERNAL_ERROR_BODY);
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('API token authentication failed', {
      error: failure,
    });
    // Everything that reaches the log carries the hash, never the secret
    const logged = inspect(error.mock.calls, { depth: null });
    expect(logged).toContain(ApiTokenHelper.hash(token));
    expect(logged).not.toContain(token);
    expect(getApiTokenAuthentication(req)).toBeUndefined();
  });

  it('should answer 500 without detail to an unexpected failure while loading the token', async () => {
    // Given
    const failure = new Error('database down');
    vi.spyOn(ApiTokenDomain, 'loadByHash').mockRejectedValue(failure);
    const error = vi.spyOn(logApp, 'error').mockImplementation(() => {});
    const req = {
      headers: {
        authorization: `Bearer ${ApiTokenHelper.generate().token}`,
      },
    } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(INTERNAL_ERROR_BODY);
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('API token authentication failed', {
      error: failure,
    });
  });

  it('should not count the failures while checking tokens against their client', async () => {
    // Given
    const ip = '192.0.2.19';
    vi.spyOn(ApiTokenDomain, 'loadByHash').mockRejectedValue(
      new Error('database down')
    );
    vi.spyOn(logApp, 'error').mockImplementation(() => {});
    for (let index = 0; index <= API_TOKEN_FAILURE_RATE_MAX; index++) {
      await apiTokenMiddleware(
        bearerRequest(ip, ApiTokenHelper.generate().token),
        response() as unknown as Response,
        vi.fn()
      );
    }
    const res = response();

    // When
    await apiTokenMiddleware(
      bearerRequest(ip, ApiTokenHelper.generate().token),
      res as unknown as Response,
      vi.fn()
    );

    // Then
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
