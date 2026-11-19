import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
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
 * Only the organizations the caller is a member of. Both conditions are needed:
 * - the session's memberships carry the API-key restriction (a token keeps only its own organization);
 * - the memberships in the database neutralise a stale session (a member removed since it was written).
 */
export const restrictOrganizationToMembersReadable = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  const organizationIds = (user.organization_capabilities ?? []).map(
    ({ organization }) => organization.id
  );
  return qb
    .whereIn('Organization.id', organizationIds)
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
