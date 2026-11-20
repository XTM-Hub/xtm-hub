import type { Request, Response } from 'express';
import { ApiTokenScope } from '../../src/__generated__/resolvers-types';
import { requestContext } from '../../src/context/request.context';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import { UserId } from '../../src/model/kanel/public/User';
import { ApiTokenApp } from '../../src/modules/api-token/api-token.app';
import { apiTokenMiddleware } from '../../src/modules/api-token/api-token.auth';
import { UserDomain } from '../../src/modules/organization-management/user/user-domain/user.domain';
import { buildRequestContext } from '../../src/server/request-context.middleware';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a token of the user for the organization, then runs the request context of a call that sends it, through
 * the real middlewares: the token user, narrowed, and the reach of the token, as a resolver would see them.
 */
const actAs = async (
  userId: UserId,
  organizationId: OrganizationId,
  scope: ApiTokenScope
): Promise<void> => {
  // Like a real call, the token is resolved outside any request context: one left by an earlier call would narrow
  // the rights its user is loaded with
  requestContext.set(undefined);
  const user = await UserDomain.loadUserBy({ 'User.id': userId });
  if (!user) {
    throw new Error(`Test user ${userId} not found`);
  }
  user.capabilities = await UserDomain.getCapabilities(user.id);
  const { token } = await ApiTokenApp.create(user, {
    name: `test ${scope}`,
    scope,
    organization_id: organizationId,
    expires_at: new Date(Date.now() + DAY_MS),
  });
  const req = {
    headers: { authorization: `Bearer ${token}` },
    session: {},
  } as unknown as Request;
  let authenticated = false;
  await apiTokenMiddleware(req, {} as Response, (error?: unknown) => {
    authenticated = error === undefined;
  });
  if (!authenticated) {
    throw new Error('Test API token refused');
  }
  requestContext.set(buildRequestContext(req));
};

export const TestApiTokenHelper = {
  apiToken: {
    actAs,
  },
};
