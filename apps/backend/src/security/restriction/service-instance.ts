import { Knex } from 'knex';
import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';

export const applyServiceInstanceVisibility = (
  builder: Knex.QueryBuilder,
  serviceInstanceRef: string
) => {
  const user = requestContext.get()?.user;

  builder.where(`${serviceInstanceRef}.public`, '=', true);

  if (!user) {
    return;
  }

  builder.orWhereExists(function () {
    this.select(dbRaw('1'))
      .from('Subscription as securitySubscription')
      .whereRaw('??.service_instance_id = ??.id', [
        'securitySubscription',
        serviceInstanceRef,
      ])
      .andWhere(
        'securitySubscription.organization_id',
        user.selected_organization_id
      );
  });
};

export const restrictServiceInstanceToPublic = (
  qb: KnexQueryBuilder,
  serviceInstanceRef: string = 'ServiceInstance'
) => {
  qb.where(`${serviceInstanceRef}.public`, '=', true);

  return qb;
};

export const restrictServiceInstanceToAccessible = (qb: KnexQueryBuilder) =>
  qb.where(function () {
    applyServiceInstanceVisibility(this, 'ServiceInstance');
  });
