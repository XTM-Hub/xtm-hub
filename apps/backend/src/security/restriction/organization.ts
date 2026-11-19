import { KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';

export const restrictOrganizationToAccessible = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  if (AuthHelper.userHasBypassCapability(user)) {
    return qb;
  }
  return qb.where('Organization.personal_space', false);
};
