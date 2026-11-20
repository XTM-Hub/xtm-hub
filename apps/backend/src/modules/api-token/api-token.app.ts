import {
  CreateApiTokenInput,
  OrganizationCapability,
} from '../../__generated__/resolvers-types';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserLoadUserBy } from '../../model/user';
import { logApp } from '../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { AuthHelper } from '../security-management/capability/auth.helper';
import { ApiTokenDomain, ApiTokenWithNames } from './api-token.domain';
import { API_TOKEN_MAX_LIFETIME_MS, ApiTokenHelper } from './api-token.helper';

const MAX_NAME_LENGTH = 100;

const membershipOf = (user: UserLoadUserBy, organizationId: OrganizationId) =>
  (user.organization_capabilities ?? []).find(
    ({ organization }) => organization.id === organizationId
  );

const administers = (user: UserLoadUserBy, organizationId: OrganizationId) =>
  AuthHelper.isUserAllowed({
    requiredCapability: OrganizationCapability.AdministrateOrganization,
    organizationCapabilities: membershipOf(user, organizationId)?.capabilities,
  });

export const ApiTokenApp = {
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
    // A token is made for an organization its user belongs to, whatever the user's portal rights
    if (!membershipOf(user, organizationId)) {
      throw new Error(NotFoundErrorCode.NotFound);
    }
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
  // a token is pinned to one organization, so it never sees nor revokes the owner's tokens of another one
  listOwn: (user: UserLoadUserBy, tokenOrganizationId?: OrganizationId) =>
    ApiTokenDomain.listByUser(user.id, tokenOrganizationId),

  listOrganization: (user: UserLoadUserBy) =>
    ApiTokenDomain.listByOrganization(user.selected_organization_id),

  // The owner revokes a token; so does an administrator of its organization
  revoke: async (
    user: UserLoadUserBy,
    id: ApiTokenId,
    tokenOrganizationId?: OrganizationId
  ): Promise<ApiTokenWithNames> => {
    const token = await ApiTokenDomain.loadById(id);
    // A token of another organization than the calling token's is answered as unknown
    if (
      !token ||
      (tokenOrganizationId && token.organization_id !== tokenOrganizationId)
    ) {
      throw new Error(NotFoundErrorCode.NotFound);
    }
    const isOwner = token.user_id === user.id;
    if (!isOwner && !administers(user, token.organization_id)) {
      // Another organization's token is not disclosed
      throw new Error(
        membershipOf(user, token.organization_id)
          ? ForbiddenErrorCode.MissingCapabilityOnOrganization
          : NotFoundErrorCode.NotFound
      );
    }
    await ApiTokenDomain.revoke(id);
    logApp.info('API token revoked', {
      api_token_id: id,
      revoked_by: user.id,
    });
    return (await ApiTokenDomain.loadById(id)) as ApiTokenWithNames;
  },
};
