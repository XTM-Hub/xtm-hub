import { Knex } from 'knex';
import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { OrganizationId } from '../../model/kanel/public/Organization';

const subscriptionOfOrganization = (
  organizationId: OrganizationId,
  serviceInstanceRef: string
) =>
  function (this: Knex.QueryBuilder) {
    this.select(dbRaw('1'))
      .from('Subscription as securitySubscription')
      .whereRaw('??.service_instance_id = ??.id', [
        'securitySubscription',
        serviceInstanceRef,
      ])
      .andWhere('securitySubscription.organization_id', organizationId);
  };

export const applyServiceInstanceVisibility = (
  builder: Knex.QueryBuilder,
  serviceInstanceRef: string
) => {
  const user = requestContext.get()?.user;

  builder.where(`${serviceInstanceRef}.public`, '=', true);

  if (!user) {
    return;
  }

  builder.orWhereExists(
    subscriptionOfOrganization(
      user.selected_organization_id,
      serviceInstanceRef
    )
  );
};

export const restrictServiceInstanceToPublic = (
  qb: KnexQueryBuilder,
  serviceInstanceRef: string = 'ServiceInstance'
) => {
  qb.where(`${serviceInstanceRef}.public`, '=', true);

  return qb;
};

export const restrictServiceInstanceToSubscribedByOrganization =
  (organizationId: OrganizationId) => (qb: KnexQueryBuilder) =>
    qb.whereExists(
      subscriptionOfOrganization(organizationId, 'ServiceInstance')
    );

export const restrictServiceInstanceToAccessible = (qb: KnexQueryBuilder) =>
  qb.where(function () {
    applyServiceInstanceVisibility(this, 'ServiceInstance');
  });
