import DataLoader from 'dataloader';
import {
  Organization,
  ServiceCapability,
  ServiceInstance,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import SubscriptionCapability, {
  SubscriptionCapabilityId,
} from '../../model/kanel/public/SubscriptionCapability';
import UserService from '../../model/kanel/public/UserService';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from './subscription.domain';

export interface SubscriptionDataLoaders {
  serviceInstanceBySubscriptionServiceInstanceIdLoader: DataLoader<
    ServiceInstanceId,
    ServiceInstance | undefined
  >;
  organizationBySubscriptionOrganizationIdLoader: DataLoader<
    OrganizationId,
    Organization | undefined
  >;
  subscriptionCapabilitiesBySubscriptionIdLoader: DataLoader<
    SubscriptionId,
    SubscriptionCapability[]
  >;
  userServicesBySubscriptionIdLoader: DataLoader<SubscriptionId, UserService[]>;
  serviceCapabilityBySubscriptionCapabilityIdLoader: DataLoader<
    SubscriptionCapabilityId,
    ServiceCapability | undefined
  >;
}

export const SubscriptionDataLoader = {
  batchLoadServiceInstances: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<(ServiceInstance | undefined)[]> => {
    const rows = await ServiceInstanceDomain.loadServiceInstancesByIds([
      ...ids,
    ]);

    const map = new Map<string, ServiceInstance>(
      rows.map((row) => [row.id, row as unknown as ServiceInstance])
    );
    return ids.map((id) => map.get(id));
  },

  batchLoadOrganizations: async (
    ids: readonly OrganizationId[]
  ): Promise<(Organization | undefined)[]> => {
    const rows = await OrganizationDomain.loadOrganizationsByIds([...ids]);

    const map = new Map<string, Organization>(
      rows.map((row) => [row.id, row as unknown as Organization])
    );
    return ids.map((id) => map.get(id));
  },

  batchLoadSubscriptionCapabilities: async (
    ids: readonly SubscriptionId[]
  ): Promise<SubscriptionCapability[][]> => {
    const rows =
      await SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds([
        ...ids,
      ]);

    const map = new Map<string, SubscriptionCapability[]>();
    for (const row of rows) {
      if (row.subscription_id === null) {
        continue;
      }
      const existing = map.get(row.subscription_id) ?? [];
      existing.push(row);
      map.set(row.subscription_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadUserServices: async (
    ids: readonly SubscriptionId[]
  ): Promise<UserService[][]> => {
    const rows = await SubscriptionDomain.loadUserServicesBySubscriptionIds([
      ...ids,
    ]);

    const map = new Map<string, UserService[]>();
    for (const row of rows) {
      const existing = map.get(row.subscription_id) ?? [];
      existing.push(row);
      map.set(row.subscription_id, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadServiceCapabilities: async (
    ids: readonly SubscriptionCapabilityId[]
  ): Promise<(ServiceCapability | undefined)[]> => {
    const rows =
      await SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds(
        [...ids]
      );

    const map = new Map<string, ServiceCapability>(
      rows.map((row) => [
        row.subscription_capability_id,
        row as unknown as ServiceCapability,
      ])
    );
    return ids.map((id) => map.get(id));
  },

  create: (): SubscriptionDataLoaders => ({
    serviceInstanceBySubscriptionServiceInstanceIdLoader: new DataLoader(
      SubscriptionDataLoader.batchLoadServiceInstances
    ),
    organizationBySubscriptionOrganizationIdLoader: new DataLoader(
      SubscriptionDataLoader.batchLoadOrganizations
    ),
    subscriptionCapabilitiesBySubscriptionIdLoader: new DataLoader(
      SubscriptionDataLoader.batchLoadSubscriptionCapabilities
    ),
    userServicesBySubscriptionIdLoader: new DataLoader(
      SubscriptionDataLoader.batchLoadUserServices
    ),
    serviceCapabilityBySubscriptionCapabilityIdLoader: new DataLoader(
      SubscriptionDataLoader.batchLoadServiceCapabilities
    ),
  }),
};
