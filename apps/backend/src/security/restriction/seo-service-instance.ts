import { dbRaw, KnexQueryBuilder } from '../../../knexfile';

export const restrictSeoServiceInstanceToPublicServiceInstance = (
  qb: KnexQueryBuilder
) =>
  qb.whereExists(function () {
    this.select(dbRaw('1'))
      .from('ServiceInstance as securityServiceInstance')
      .whereRaw('??.id = ??.service_instance_id', [
        'securityServiceInstance',
        'SEO_ServiceInstance',
      ])
      .andWhere('securityServiceInstance.public', '=', true);
  });
