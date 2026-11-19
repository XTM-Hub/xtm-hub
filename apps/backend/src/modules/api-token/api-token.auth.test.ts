import type { NextFunction, Request, Response } from 'express';
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
import { ErrorCode } from '../../utils/error/error.code';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ApiTokenApp } from './api-token.app';
import {
  apiTokenMiddleware,
  getApiTokenAuthentication,
  resolveApiToken,
} from './api-token.auth';
import { ApiTokenDomain } from './api-token.domain';
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

const expectRefused = async (secret: string, reason: string, now?: Date) => {
  const resolution = await resolveApiToken(secret, now);
  expect(resolution).toEqual({ authenticated: false, reason });
};

describe('resolveApiToken', () => {
  it('should run a read_write token as its user, pinned to its organization, without organization administration', async () => {
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
    expect(user.selected_org_capabilities).not.toContain(
      OrganizationCapability.AdministrateOrganization
    );
    expect(user.capabilities).toEqual([]);
  });

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
    // loadUserBy refuses a disabled user, whatever the organization asked
    vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValue(
      new Error(ErrorCode.UserDisabled)
    );

    // Then
    await expectRefused(token, 'user disabled');
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
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
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
    expect(touch).toHaveBeenCalledWith(api_token.id, expect.any(Date));
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

  it('should answer 401 to a token of a disabled user', async () => {
    // Given
    const { token } = await createToken(
      SECOND.USERS.SIMPLE.ID,
      SECOND.ID,
      ApiTokenScope.Read
    );
    vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValue(
      new Error(ErrorCode.UserDisabled)
    );
    const warn = vi.spyOn(logApp, 'warn');
    const error = vi.spyOn(logApp, 'error');
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = response();
    const next = vi.fn();

    // When
    await apiTokenMiddleware(req, res as unknown as Response, next);

    // Then
    expect(res.status).toHaveBeenCalledWith(401);
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
    const failure = new Error('relation "User_Organization" does not exist');
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
    const [[, logged]] = error.mock.calls as [[string, { error: Error }]];
    expect(logged.error.message).not.toContain(token);
    expect(logged.error.stack).not.toContain(token);
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
});
