import { KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';

export const restrictUserServiceToUserOrganization = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  return qb
    .innerJoin(
      'Subscription as securitySubscription',
      'User_Service.subscription_id',
      '=',
      'securitySubscription.id'
    )
    .where(
      'securitySubscription.organization_id',
      user.selected_organization_id
    );
};
