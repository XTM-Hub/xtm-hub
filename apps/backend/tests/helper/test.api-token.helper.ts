import type { Request, Response } from 'express';
import { vi } from 'vitest';
import { db } from '../../knexfile';
import { ApiTokenScope } from '../../src/__generated__/resolvers-types';
import { requestContext } from '../../src/context/request.context';
import ApiToken, { ApiTokenId } from '../../src/model/kanel/public/ApiToken';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import { UserId } from '../../src/model/kanel/public/User';
import { UserLoadUserBy } from '../../src/model/user';
import { apiTokenMiddleware } from '../../src/modules/api-token/api-token.auth';
import { ApiTokenDomain } from '../../src/modules/api-token/api-token.domain';
import { ApiTokenHelper } from '../../src/modules/api-token/api-token.helper';
import { buildRequestContext } from '../../src/server/request-context.middleware';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ApiTokenRequest {
  req: Request;
  tokenId: ApiTokenId;
  // The middleware let the request through
  authenticated: boolean;
  cleanup: () => Promise<void>;
}

const remove = async (id: ApiTokenId): Promise<void> => {
  await db<ApiToken>('ApiToken').where('id', id).delete();
};

const runMiddleware = async (req: Request): Promise<boolean> => {
  let authenticated = false;
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(),
  } as unknown as Response;
  await apiTokenMiddleware(req, res, (error?: unknown) => {
    authenticated = error === undefined;
  });
  return authenticated;
};

// A token of the user for the organization. Inserted through the domain, as the app does, so that a test that spies on
// the app does not see it: the user need not belong to the organization, which is the guard's business
const create = async ({
  userId,
  organizationId,
  scope = ApiTokenScope.ReadWrite,
}: {
  userId: UserId;
  organizationId: OrganizationId;
  scope?: ApiTokenScope;
}) => {
  const { token, tokenPrefix, tokenHash } = ApiTokenHelper.generate();
  const { id } = await ApiTokenDomain.insert({
    user_id: userId,
    organization_id: organizationId,
    name: `test ${scope}`,
    token_prefix: tokenPrefix,
    token_hash: tokenHash,
    scope,
    expires_at: new Date(Date.now() + DAY_MS),
  });
  const apiToken = await ApiTokenDomain.loadById(id);
  if (!apiToken) {
    throw new Error(`Test API token ${id} not found after its insert`);
  }
  return { secret: token, apiToken, cleanup: () => remove(id) };
};

/**
 * Creates a token of the user for the organization and sends it on a request through the real middleware, like a
 * call of an API client. A request that carries a session user too is a call with a Bearer token and a cookie.
 */
const send = async ({
  userId,
  organizationId,
  scope,
  sessionUser,
}: {
  userId: UserId;
  organizationId: OrganizationId;
  scope: ApiTokenScope;
  sessionUser?: UserLoadUserBy;
}): Promise<ApiTokenRequest> => {
  // Like a real call, the token is resolved outside any request context: one left by an earlier call would narrow
  // the rights its user is loaded with
  requestContext.set(undefined);
  const { secret, apiToken: api_token } = await create({
    userId,
    organizationId,
    scope,
  });
  const req = {
    headers: { authorization: `Bearer ${secret}` },
    session: sessionUser ? { user: sessionUser } : {},
  } as unknown as Request;
  return {
    req,
    tokenId: api_token.id,
    authenticated: await runMiddleware(req),
    cleanup: () => remove(api_token.id),
  };
};

/**
 * Runs the request context of a call that sends a valid token of the user for the organization, through the real
 * middlewares: the token user, narrowed, and the reach of the token, as a resolver would see them.
 */
const actAs = async (
  userId: UserId,
  organizationId: OrganizationId,
  scope: ApiTokenScope
): Promise<void> => {
  const { req, authenticated } = await send({ userId, organizationId, scope });
  if (!authenticated) {
    throw new Error('Test API token refused');
  }
  requestContext.set(buildRequestContext(req));
};

export const TestApiTokenHelper = {
  apiToken: {
    actAs,
    create,
    send,
    delete: remove,
  },
};
