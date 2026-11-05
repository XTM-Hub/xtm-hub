import { Knex } from 'knex';
import { dbRaw, KnexQueryBuilder } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import { applyServiceInstanceVisibility } from './service-instance';

export const restrictDocumentToPublished = (qb: KnexQueryBuilder) => {
  return qb.where('Document.active', '=', 'true');
};

export const restrictDocumentToUserOrganization = (qb: KnexQueryBuilder) => {
  const user = requestContext.requireUser();
  qb.leftJoin('ServiceInstance as securityServiceInstance', function () {
    this.on('securityServiceInstance.id', '=', 'Document.service_instance_id');
  })
    .leftJoin('Subscription as securitySubscription', function () {
      this.on(
        'securitySubscription.service_instance_id',
        '=',
        'securityServiceInstance.id'
      ).andOn(
        'securitySubscription.organization_id',
        '=',
        dbRaw('?', [user?.selected_organization_id])
      );
    })
    .leftJoin('User_Service as securityUserService', function () {
      this.on(
        'securityUserService.subscription_id',
        '=',
        'securitySubscription.id'
      ).andOn('securityUserService.user_id', '=', dbRaw('?', [user?.id]));
    });

  return qb;
};

const restrictDocumentToServiceInstance = (
  qb: KnexQueryBuilder,
  applyCondition: (builder: Knex.QueryBuilder) => void
) =>
  qb.where(function () {
    this.whereNull('Document.service_instance_id').orWhereExists(function () {
      this.select(dbRaw('1'))
        .from('ServiceInstance as securityServiceInstance')
        .whereRaw('??.id = ??.service_instance_id', [
          'securityServiceInstance',
          'Document',
        ])
        .andWhere(function () {
          applyCondition(this);
        });
    });
  });

export const restrictDocumentToPublicServiceInstance = (qb: KnexQueryBuilder) =>
  restrictDocumentToServiceInstance(qb, (builder) => {
    builder.where('securityServiceInstance.public', '=', true);
  });

export const restrictDocumentToAccessibleServiceInstance = (
  qb: KnexQueryBuilder
) =>
  restrictDocumentToServiceInstance(qb, (builder) => {
    applyServiceInstanceVisibility(builder, 'securityServiceInstance');
  });
