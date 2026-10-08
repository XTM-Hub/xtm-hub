import DataLoader from 'dataloader';
import { RegisteredPlatform } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { mapDomainRegisteredPlatformToGraphQL } from './registration.app';
import { RegistrationDomain } from './registration.domain';

export interface RegistrationDataLoaders {
  registeredPlatformByServiceInstanceLoader: DataLoader<
    ServiceInstanceId,
    RegisteredPlatform | null
  >;
  ownerOrganizationIdByServiceInstanceLoader: DataLoader<
    ServiceInstanceId,
    OrganizationId | null
  >;
}

export const RegistrationDataLoader = {
  batchLoadRegisteredPlatforms: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<(RegisteredPlatform | null)[]> => {
    const rows =
      await RegistrationDomain.loadRegisteredPlatformsByServiceInstanceIds(
        serviceInstanceIds
      );

    const map = new Map<string, RegisteredPlatform>();
    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, mapDomainRegisteredPlatformToGraphQL(row));
      }
    }
    return serviceInstanceIds.map((id) => map.get(id) ?? null);
  },

  batchLoadOwnerOrganizationIds: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<(OrganizationId | null)[]> => {
    const subscriptions =
      await RegistrationDomain.loadPlatformOwnerSubscriptionsByServiceInstanceIds(
        serviceInstanceIds
      );

    const map = new Map<string, OrganizationId>(
      subscriptions.map((subscription) => [
        subscription.service_instance_id,
        subscription.organization_id,
      ])
    );
    return serviceInstanceIds.map((id) => map.get(id) ?? null);
  },

  create: (): RegistrationDataLoaders => ({
    registeredPlatformByServiceInstanceLoader: new DataLoader(
      RegistrationDataLoader.batchLoadRegisteredPlatforms
    ),
    ownerOrganizationIdByServiceInstanceLoader: new DataLoader(
      RegistrationDataLoader.batchLoadOwnerOrganizationIds
    ),
  }),
};
