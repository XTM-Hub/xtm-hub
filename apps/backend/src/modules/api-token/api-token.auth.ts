import type { NextFunction, Request, Response } from 'express';
import {
  ApiTokenScope,
  OrganizationCapability,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ApiTokenDomain } from './api-token.domain';
import { ApiTokenHelper } from './api-token.helper';
import {
  countApiTokenFailure,
  isApiTokenFailureLimitReached,
  recentApiTokens,
} from './api-token.rate-limit';

// What a request authenticated by an API token knows about it
export interface ApiTokenCaller {
  id: ApiTokenId;
  name: string;
  scope: ApiTokenScope;
  organization_id: OrganizationId;
  expires_at: Date;
}

export interface ApiTokenAuthentication {
  token: ApiTokenCaller;
  user: UserLoadUserBy;
}

// Written once per minute per token at most: a call never waits on it
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;
const lastUsedWrites = new Map<string, number>();

const authentications = new WeakMap<Request, ApiTokenAuthentication>();

export const getApiTokenAuthentication = (
  req: Request | undefined
): ApiTokenAuthentication | undefined =>
  req ? authentications.get(req) : undefined;

/**
 * The user a token acts as: the token's user as loaded now, so a right removed, a disabled account or a membership
 * ended takes effect on the next call, narrowed to what the token may do.
 * - Only the token's organization: it is pinned as the selected one, the others are hidden.
 * - Without the admin scope: no portal capability, and no ADMINISTRATE_ORGANIZATION (which implies every
 *   organization capability).
 * - With the admin scope: the user's portal capabilities, BYPASS excepted. A token never carries BYPASS.
 */
export const narrowUserToToken = (
  user: UserLoadUserBy,
  token: Pick<ApiTokenCaller, 'scope' | 'organization_id'>
): UserLoadUserBy | undefined => {
  const membership = (user.organization_capabilities ?? []).find(
    ({ organization }) => organization.id === token.organization_id
  );
  if (!membership) {
    return undefined;
  }
  const isAdmin = token.scope === ApiTokenScope.Admin;
  const organizationCapabilities = isAdmin
    ? membership.capabilities
    : membership.capabilities.filter(
        (capability) =>
          capability !== OrganizationCapability.AdministrateOrganization
      );
  return {
    ...user,
    selected_organization_id: token.organization_id,
    organizations: user.organizations.filter(
      ({ id }) => id === token.organization_id
    ),
    organization_capabilities: [
      { ...membership, capabilities: organizationCapabilities },
    ],
    selected_org_capabilities: organizationCapabilities,
    capabilities: isAdmin
      ? user.capabilities.filter(
          ({ name }) => name !== (PortalCapability.Bypass as string)
        )
      : [],
    // The platform administrator role is read as BYPASS in places: a token never carries it
    roles_portal: user.roles_portal.filter(({ id }) => id !== ROLE_ADMIN.id),
  };
};

type Resolution =
  | { authenticated: true; authentication: ApiTokenAuthentication }
  | { authenticated: false; reason: string };

export const resolveApiToken = async (
  secret: string,
  now: Date = new Date()
): Promise<Resolution> => {
  if (!ApiTokenHelper.isWellFormed(secret)) {
    return { authenticated: false, reason: 'malformed' };
  }
  const token = await ApiTokenDomain.loadByHash(ApiTokenHelper.hash(secret));
  if (!token) {
    return { authenticated: false, reason: 'unknown' };
  }
  if (token.revoked_at) {
    return { authenticated: false, reason: 'revoked' };
  }
  if (token.expires_at.getTime() <= now.getTime()) {
    return { authenticated: false, reason: 'expired' };
  }
  let user: UserLoadUserBy | undefined;
  try {
    // Restricted to the token's organization: a user who left it is not found
    user = await UserDomain.loadUserBy({
      'User.id': token.user_id,
      'Organization.id': token.organization_id,
    });
  } catch {
    // loadUserBy throws for a disabled user
    return { authenticated: false, reason: 'user disabled' };
  }
  if (!user || user.disabled) {
    return { authenticated: false, reason: 'user not in organization' };
  }
  user.capabilities = await UserDomain.getCapabilities(user.id);
  const narrowed = narrowUserToToken(user, token);
  if (!narrowed) {
    return { authenticated: false, reason: 'user not in organization' };
  }
  return {
    authenticated: true,
    authentication: {
      token: {
        id: token.id,
        name: token.name,
        scope: token.scope,
        organization_id: token.organization_id,
        expires_at: token.expires_at,
      },
      user: narrowed,
    },
  };
};

const recordUse = (id: ApiTokenId, now: Date) => {
  const last = lastUsedWrites.get(id);
  if (
    last !== undefined &&
    now.getTime() - last < LAST_USED_WRITE_INTERVAL_MS
  ) {
    return;
  }
  lastUsedWrites.set(id, now.getTime());
  ApiTokenDomain.touchLastUsed(id, now).catch((error: unknown) =>
    logApp.warn('Could not record the last use of an API token', {
      error,
      api_token_id: id,
    })
  );
};

const sendUnauthenticated = (res: Response) => {
  res.status(401).json({
    errors: [
      {
        message: 'UNAUTHENTICATED',
        extensions: { code: 'UNAUTHENTICATED' },
      },
    ],
  });
};

/**
 * `Authorization: Bearer xhp_...` authenticates the request as the token's user. Any other request goes on unchanged
 * (session cookie, system token, platform token). A refused token answers 401 whatever the route: the caller asked
 * for the token's identity, it never falls back to a session. Refused tokens are counted per client IP: over the
 * limit, the client gets 429 and its tokens are no longer looked up until the window ends, except the tokens accepted
 * recently, which are still looked up and checked as usual.
 */
export const apiTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = ApiTokenHelper.fromAuthorizationHeader(
    req.headers.authorization
  );
  if (!secret) {
    next();
    return;
  }
  try {
    const refuse = () =>
      countApiTokenFailure(req, res, () => sendUnauthenticated(res), next);
    const tokenHash = ApiTokenHelper.hash(secret);
    // Over the limit: answered 429 without looking the token up, unless it was accepted recently
    if (
      !recentApiTokens.has(tokenHash) &&
      (await isApiTokenFailureLimitReached(req))
    ) {
      await refuse();
      return;
    }
    const now = new Date();
    const resolution = await resolveApiToken(secret, now);
    if (!resolution.authenticated) {
      recentApiTokens.forget(tokenHash);
      logApp.warn('API token refused', { reason: resolution.reason });
      await refuse();
      return;
    }
    recentApiTokens.remember(tokenHash, now.getTime());
    authentications.set(req, resolution.authentication);
    recordUse(resolution.authentication.token.id, now);
    next();
  } catch (error) {
    next(error);
  }
};
