import { CreateApiTokenInput } from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { logApp } from '../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';
import { API_TOKEN_MAX_LIFETIME_MS, ApiTokenHelper } from './api-token.helper';

const MAX_NAME_LENGTH = 100;

export const ApiTokenApp = {
  // Only reachable behind the guard of createApiToken, which checks that the user belongs to the organization
  create: async (
    user: UserLoadUserBy,
    input: CreateApiTokenInput,
    now: Date = new Date()
  ): Promise<{ token: string; api_token: ApiTokenWithNames }> => {
    const name = input.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new Error(BadRequestErrorCode.InvalidApiToken);
    }
    const expiresAt = new Date(input.expires_at);
    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= now.getTime() ||
      expiresAt.getTime() - now.getTime() > API_TOKEN_MAX_LIFETIME_MS
    ) {
      throw new Error(BadRequestErrorCode.InvalidApiToken);
    }
    const organizationId = input.organization_id as OrganizationId;
    const { token, tokenPrefix, tokenHash } = ApiTokenHelper.generate();
    const created = await ApiTokenDomain.insert({
      user_id: user.id,
      organization_id: organizationId,
      name,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scope: input.scope,
      expires_at: expiresAt,
    });
    logApp.info('API token created', {
      api_token_id: created.id,
      user_id: user.id,
      organization_id: organizationId,
      scope: input.scope,
    });
    const withNames = await ApiTokenDomain.loadById(created.id);
    return { token, api_token: withNames as ApiTokenWithNames };
  },

  // tokenOrganizationId is the organization of the token that authenticates the request, undefined for a session:
  // a token is pinned to one organization, so it never sees the owner's tokens of another one
  listOwn: (user: UserLoadUserBy, tokenOrganizationId?: OrganizationId) =>
    ApiTokenDomain.listByUser(user.id, tokenOrganizationId),

  listOrganization: (user: UserLoadUserBy) =>
    ApiTokenDomain.listByOrganization(user.selected_organization_id),

  // Only reachable behind the guard of revokeApiToken: the owner or an administrator of its organization
  revoke: async (
    user: UserLoadUserBy,
    id: ApiTokenId
  ): Promise<ApiTokenWithNames> => {
    const token = await ApiTokenDomain.loadById(id);
    if (!token) {
      throw new Error(NotFoundErrorCode.NotFound);
    }
    await ApiTokenDomain.revoke(id);
    logApp.info('API token revoked', {
      api_token_id: id,
      revoked_by: user.id,
    });
    return (await ApiTokenDomain.loadById(id)) as ApiTokenWithNames;
  },
};
