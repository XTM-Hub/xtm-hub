import { KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';

export const restrictSubscriptionToUserOrganization = (
  qb: KnexQueryBuilder
) => {
  const user = requestContext.requireUser();
  return qb.where(
    'Subscription.organization_id',
    user.selected_organization_id
  );
};
