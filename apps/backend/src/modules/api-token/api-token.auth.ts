import type { NextFunction, Request, Response } from 'express';
import {
  ApiTokenScope,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { getErrorMessage } from '../../utils/error/error-guard.util';
import { ErrorCode } from '../../utils/error/error.code';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { ApiTokenDomain } from './api-token.domain';
import { API_TOKEN_ERRORS, sendApiTokenError } from './api-token.errors';
import {
  admitApiTokenLookup,
  countRefusedApiToken,
  type LookupReservation,
  recentApiTokens,
  releaseApiTokenLookup,
} from './api-token.failure-limit';
import { ApiTokenHelper } from './api-token.helper';

// What a request authenticated by an API token knows about it
export interface ApiTokenCaller {
  id: ApiTokenId;
  name: string;
  scope: ApiTokenScope;
  organization_id: OrganizationId;
  expires_at: Date;
  last_used_at: Date | null;
}

export interface ApiTokenAuthentication {
  token: ApiTokenCaller;
  user: UserLoadUserBy;
}

// Written once per minute per token at most: a call never waits on it. The throttle reads the `last_used_at` loaded
// with the token, so it holds across restarts and replicas and keeps nothing in memory.
const LAST_USED_WRITE_INTERVAL_MS = 60 * 1000;

const authentications = new WeakMap<Request, ApiTokenAuthentication>();

export const getApiTokenAuthentication = (
  req: Request | undefined
): ApiTokenAuthentication | undefined =>
  req ? authentications.get(req) : undefined;

/**
 * The user a token acts as: the token's user as loaded now, so a right removed, a disabled account or a membership
 * ended takes effect on the next call, narrowed to what the token may do.
 * - Only the token's organization: it is pinned as the selected one, the others are hidden.
 * - Without the admin scope: no portal capability and no organization capability. Every organization capability
 *   administers the organization (its members and their rights, its subscriptions, its platforms), and read_write is
 *   not administration.
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
  const organizationCapabilities = isAdmin ? membership.capabilities : [];
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
  } catch (error) {
    // loadUserBy throws USER_DISABLED for a disabled user. Any other failure (database down, a bug) is not a refused
    // token: it goes up to the middleware, which answers 500 instead of telling the client its token is bad.
    if (getErrorMessage(error) === ErrorCode.UserDisabled) {
      return { authenticated: false, reason: 'user disabled' };
    }
    throw error;
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
        last_used_at: token.last_used_at,
      },
      user: narrowed,
    },
  };
};

const recordUse = ({ id, last_used_at }: ApiTokenCaller, now: Date) => {
  if (
    last_used_at &&
    now.getTime() - last_used_at.getTime() < LAST_USED_WRITE_INTERVAL_MS
  ) {
    return;
  }
  // The write is conditional on the stored value too: concurrent calls that all read an old `last_used_at` write once
  ApiTokenDomain.touchLastUsed(id, now, LAST_USED_WRITE_INTERVAL_MS).catch(
    (error: unknown) =>
      logApp.warn('Could not record the last use of an API token', {
        error,
        api_token_id: id,
      })
  );
};

/**
 * `Authorization: Bearer xhp_...` authenticates the request as the token's user. Any other request goes on unchanged
 * (session cookie, system token, platform token). A refused token answers 401 whatever the route: the caller asked
 * for the token's identity, it never falls back to a session. Refused tokens are counted per client IP: over the
 * limit, the client gets 429 and its tokens are no longer looked up until the window ends, except the tokens accepted
 * recently, which are still looked up and checked as usual. A token that was looked up and refused always gets 401.
 * A failure while checking the token answers 500 with no detail, and is not counted: the error only goes to the logs.
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
  const tokenHash = ApiTokenHelper.hash(secret);
  // A token not accepted recently reserves a hit before its lookup and, over the limit, is answered 429 without one
  let reservation: LookupReservation | undefined;
  if (!recentApiTokens.has(tokenHash)) {
    reservation = admitApiTokenLookup(req, res);
    if (!reservation) {
      return;
    }
  }
  const now = new Date();
  let resolution: Resolution;
  try {
    resolution = await resolveApiToken(secret, now);
  } catch (error) {
    // Not a refused token: an outage must not use up the allowance of every client
    if (reservation) {
      releaseApiTokenLookup(reservation);
    }
    // Never the secret: only the error, whose query carries the token hash at most
    logApp.error('API token authentication failed', { error });
    // The same code Apollo gives an internal error on the GraphQL routes
    sendApiTokenError(res, API_TOKEN_ERRORS.UnknownError);
    return;
  }
  if (!resolution.authenticated) {
    recentApiTokens.forget(tokenHash);
    // A reserved hit stays as the refusal; a token accepted recently had none
    if (!reservation) {
      countRefusedApiToken(req);
    }
    logApp.warn('API token refused', { reason: resolution.reason });
    sendApiTokenError(res, API_TOKEN_ERRORS.Unauthenticated);
    return;
  }
  if (reservation) {
    releaseApiTokenLookup(reservation);
  }
  recentApiTokens.remember(tokenHash, now.getTime());
  authentications.set(req, resolution.authentication);
  recordUse(resolution.authentication.token, now);
  next();
};

/**
 * A token authenticates the GraphQL API only, where apiTokenPlugin enforces its scope and denylist. Any other route
 * (`/graphql-sse`, REST, `/auth`) authorizes the session while the request context runs as the token's user: the
 * token is refused there rather than ignored.
 */
export const refuseApiTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authentication = getApiTokenAuthentication(req);
  if (!authentication) {
    next();
    return;
  }
  logApp.warn('API token refused outside the GraphQL API', {
    api_token_id: authentication.token.id,
    path: req.path,
  });
  sendApiTokenError(res, API_TOKEN_ERRORS.NotAllowedWithApiToken);
};
