import { KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';

export const restrictSubscriptionToUserOrganization = (
  qb: KnexQueryBuilder
) => {
  const user = requestContext.requireUser();
  if (AuthHelper.userHasBypassCapability(user)) {
    return qb;
  }
  return qb.where(
    'Subscription.organization_id',
    user.selected_organization_id
  );
};
