import DataLoader from 'dataloader';
import {
  Organization,
  RegisteredPlatform,
} from '../../__generated__/resolvers-types';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { mapDomainRegisteredPlatformToGraphQL } from './registration.app';
import { RegistrationDomain } from './registration.domain';

export interface RegistrationDataLoaders {
  registeredPlatformByServiceInstanceLoader: DataLoader<
    ServiceInstanceId,
    RegisteredPlatform | null
  >;
  ownerOrganizationByServiceInstanceLoader: DataLoader<
    ServiceInstanceId,
    Organization | null
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

  batchLoadOwnerOrganizations: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<(Organization | null)[]> => {
    const rows =
      await RegistrationDomain.loadPlatformOwnerOrganizationsByServiceInstanceIds(
        serviceInstanceIds
      );

    const map = new Map<string, Organization>(
      rows.map(({ service_instance_id, ...organization }) => [
        service_instance_id,
        organization as unknown as Organization,
      ])
    );
    return serviceInstanceIds.map((id) => map.get(id) ?? null);
  },

  create: (): RegistrationDataLoaders => ({
    registeredPlatformByServiceInstanceLoader: new DataLoader(
      RegistrationDataLoader.batchLoadRegisteredPlatforms
    ),
    ownerOrganizationByServiceInstanceLoader: new DataLoader(
      RegistrationDataLoader.batchLoadOwnerOrganizations
    ),
  }),
};
