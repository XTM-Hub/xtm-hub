import { KnexQueryBuilder } from '../../../knexfile';
import { ApiTokenReach } from '../api-token-reach';

/**
 * A request authenticated by an API token shows the token's user only what the token kept of them
 * (narrowUserToToken). Applied to the rows of userId, they restrict nothing for a session, nor for the rows of
 * another user than the token's.
 */
export const restrictOrganizationToApiToken =
  (userId: string) => (qb: KnexQueryBuilder) => {
    const apiToken = ApiTokenReach.overUser(userId);
    return apiToken ? qb.where('Organization.id', apiToken.organizationId) : qb;
  };

export const restrictCapabilityPortalToApiToken =
  (userId: string) => (qb: KnexQueryBuilder) => {
    const apiToken = ApiTokenReach.overUser(userId);
    return apiToken
      ? qb.whereIn('CapabilityPortal.id', apiToken.portalCapabilityIds)
      : qb;
  };

export const restrictRolePortalToApiToken =
  (userId: string) => (qb: KnexQueryBuilder) => {
    const apiToken = ApiTokenReach.overUser(userId);
    return apiToken ? qb.whereIn('RolePortal.id', apiToken.rolePortalIds) : qb;
  };
