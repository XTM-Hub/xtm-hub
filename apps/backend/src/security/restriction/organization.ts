import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { isUserRestrictedToOwnOrganizationMembers } from '../../modules/organization-management/organization/organization.security';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';
import { restrictOrganizationToApiToken } from './api-token';

export const restrictOrganizationToProfessionalSpace = (
  qb: KnexQueryBuilder
) => {
  const user = requestContext.requireUser();
  if (AuthHelper.userHasBypassCapability(user)) {
    return qb;
  }
  return qb.where('Organization.personal_space', false);
};

// Skipped for BYPASS and READ_ORGANIZATION_MEMBERS holders, their admin API keys included, on purpose
export const restrictOrganizationToMembersReadable = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  if (!isUserRestrictedToOwnOrganizationMembers(user)) {
    return qb;
  }
  // Membership read from the database, not the session: a member removed since their login reads none
  return qb
    .tap(restrictOrganizationToApiToken(user.id))
    .whereExists(function () {
      this.select(dbRaw('1'))
        .from('User_Organization as securityUserOrganization')
        .whereRaw('??.organization_id = ??.id', [
          'securityUserOrganization',
          'Organization',
        ])
        .andWhere('securityUserOrganization.user_id', user.id);
    });
};
