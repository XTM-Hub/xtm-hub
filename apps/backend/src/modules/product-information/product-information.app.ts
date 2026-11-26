import {
  QuerySaasManagerPlatformsArgs,
  SaasPlatformConnection,
  SaasPlatformData,
  SaasPlatformMetricsPeriod,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { RegistrationDomain } from '../registration/registration.domain';
import { ProductInformationHelper } from './product-information.helper';

export const ProductInformationApp = {
  loadRegisteredSaasPlatformData: async (
    serviceInstanceId: ServiceInstanceId,
    metricsPeriod: SaasPlatformMetricsPeriod
  ): Promise<SaasPlatformData | null> => {
    // Resolve the platform through the organization-scoped query first, so that
    // only a platform the user can access is read, with the platform_id stored
    // in the Hub, never a client-supplied one.
    const [platform] =
      await RegistrationDomain.loadRegisteredPlatform(serviceInstanceId);
    if (!platform) {
      return null;
    }

    return ProductInformationHelper.loadSaasPlatformData(
      serviceInstanceId,
      platform.platform_id,
      metricsPeriod
    );
  },

  loadSaasManagerPlatforms: async ({
    first,
    after,
    orderBy,
    orderMode,
    searchTerm,
    product,
  }: QuerySaasManagerPlatformsArgs): Promise<SaasPlatformConnection> =>
    ProductInformationHelper.loadSaasPlatforms({
      first,
      after,
      orderBy,
      orderMode,
      searchTerm,
      product,
    }),
};
