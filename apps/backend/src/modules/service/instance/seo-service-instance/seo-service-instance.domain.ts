import { db } from '../../../../../knexfile';
import {
  EditSeoServiceInstanceInput,
  Locale,
  PortalCapability,
  SeoServiceInstanceMetadata,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { SEOServiceInstanceMutator } from '../../../../model/kanel/public/SEOServiceInstance';
import { ServiceInstanceId } from '../../../../model/kanel/public/ServiceInstance';
import { restrictSeoServiceInstanceToPublicServiceInstance } from '../../../../security/restriction/seo-service-instance';
import { NotFoundErrorCode } from '../../../../utils/error/error.code';
import { AuthHelper } from '../../../security-management/capability/auth.helper';

const canReadPrivateServiceMetadata = () =>
  AuthHelper.userHasPortalCapability(requestContext.get()?.user, [
    PortalCapability.ModifyServiceMetadata,
  ]);

export const SeoServiceInstanceDomain = {
  loadSeoServiceInstancesBy: async (
    field: SEOServiceInstanceMutator
  ): Promise<SeoServiceInstanceMetadata[]> => {
    return db<SeoServiceInstanceMetadata>('SEO_ServiceInstance')
      .where(field)
      .modify((queryBuilder) => {
        if (!canReadPrivateServiceMetadata()) {
          restrictSeoServiceInstanceToPublicServiceInstance(queryBuilder);
        }
      });
  },

  upsertSeoServiceInstance: async (
    serviceInstanceId: ServiceInstanceId,
    language: Locale,
    payload: EditSeoServiceInstanceInput
  ): Promise<SeoServiceInstanceMetadata> => {
    const [seoServiceInstance] = await db<SeoServiceInstanceMetadata>(
      'SEO_ServiceInstance'
    )
      .insert({
        service_instance_id: serviceInstanceId,
        language,
        ...payload,
      })
      .onConflict(['service_instance_id', 'language'])
      .merge(payload)
      .returning('*');

    if (!seoServiceInstance) {
      throw new Error(NotFoundErrorCode.SeoServiceInstanceNotFound);
    }

    return seoServiceInstance;
  },
};
