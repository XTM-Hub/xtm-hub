import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { isUserRestrictedToOwnOrganizationMembers } from '../../modules/organization-management/organization/organization.security';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';

export const restrictOrganizationToProfessionalSpace = (
  qb: KnexQueryBuilder
) => {
  const user = requestContext.requireUser();
  if (AuthHelper.userHasBypassCapability(user)) {
    return qb;
  }
  return qb.where('Organization.personal_space', false);
};

/**
 * A caller without READ_ORGANIZATION_MEMBERS reads the members of their own organizations only, as the database
 * knows them, so that a member removed since their session was written reads none. An API token reaches its own
 * organization only (ApiTokenReach.allowsOrganization), although its user may belong to others.
 */
export const restrictOrganizationToMembersReadable = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  if (!isUserRestrictedToOwnOrganizationMembers(user)) {
    return qb;
  }
  const apiToken = requestContext.get()?.apiToken;
  if (apiToken) {
    qb.where('Organization.id', apiToken.organizationId);
  }
  return qb.whereExists(function () {
    this.select(dbRaw('1'))
      .from('User_Organization as securityUserOrganization')
      .whereRaw('??.organization_id = ??.id', [
        'securityUserOrganization',
        'Organization',
      ])
      .andWhere('securityUserOrganization.user_id', user.id);
  });
};
