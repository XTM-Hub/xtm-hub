import DataLoader from 'dataloader';
import {
  ServiceDefinition,
  ServiceInstance,
  ServiceLink,
  SubscriptionModel,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { isUserAdminPlatform } from '../../../security/access';
import { UserServiceCapabilityHelper } from '../../security-management/user-service-capability/user-service-capability.helper';
import { ServiceInstanceDomain } from './service-instance.domain';
import {
  OrganizationServiceInstanceKey,
  organizationServiceInstanceKey,
  ServiceInstanceUserOrganizationKey,
  serviceInstanceUserOrganizationKey,
} from './service-instance.keys';

export interface ServiceInstanceDataLoaders {
  linksByServiceInstanceLoader: DataLoader<ServiceInstanceId, ServiceLink[]>;
  serviceDefinitionByServiceInstanceLoader: DataLoader<
    ServiceInstanceId,
    ServiceDefinition | undefined
  >;
  organizationSubscribedLoader: DataLoader<
    OrganizationServiceInstanceKey,
    boolean
  >;
  capabilitiesLoader: DataLoader<ServiceInstanceUserOrganizationKey, string[]>;
  userJoinedLoader: DataLoader<ServiceInstanceUserOrganizationKey, boolean>;
  subscriptionsByServiceInstanceLoader: DataLoader<
    OrganizationServiceInstanceKey,
    SubscriptionModel[]
  >;
  serviceInstanceByIdLoader: DataLoader<
    ServiceInstanceId,
    ServiceInstance | undefined
  >;
}

export const ServiceInstanceDataLoader = {
  batchLoadLinks: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<ServiceLink[][]> => {
    const rows = await ServiceInstanceDomain.loadLinksByServiceInstanceIds(ids);

    const map = new Map<string, ServiceLink[]>();
    for (const row of rows) {
      const serviceInstanceId = row.service_instance_id as ServiceInstanceId;
      const existing = map.get(serviceInstanceId) ?? [];
      existing.push(row);
      map.set(serviceInstanceId, existing);
    }
    return ids.map((id) => map.get(id) ?? []);
  },

  batchLoadServiceDefinitions: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<(ServiceDefinition | undefined)[]> => {
    const rows =
      await ServiceInstanceDomain.loadServiceDefinitionsByServiceInstanceIds(
        ids
      );

    const map = new Map<string, ServiceDefinition>(
      rows.map((row) => [row.service_instance_id, row])
    );
    return ids.map((id) => map.get(id));
  },

  batchLoadOrganizationSubscribed: async (
    keys: readonly OrganizationServiceInstanceKey[]
  ): Promise<boolean[]> => {
    const parsedKeys = keys.map(organizationServiceInstanceKey.parse);
    const rows = await ServiceInstanceDomain.loadIsSubscribedByKeys(parsedKeys);

    const subscribedKeys = new Set(
      rows.map((row) =>
        organizationServiceInstanceKey.create({
          organizationId: row.organization_id,
          serviceInstanceId: row.service_instance_id,
        })
      )
    );
    return keys.map((key) => subscribedKeys.has(key));
  },

  batchLoadCapabilities: async (
    keys: readonly ServiceInstanceUserOrganizationKey[]
  ): Promise<string[][]> => {
    const parsedKeys = keys.map(serviceInstanceUserOrganizationKey.parse);
    return UserServiceCapabilityHelper.loadCapabilitiesByKeys(parsedKeys);
  },

  batchLoadUserJoined: async (
    keys: readonly ServiceInstanceUserOrganizationKey[]
  ): Promise<boolean[]> => {
    const parsedKeys = keys.map(serviceInstanceUserOrganizationKey.parse);
    const rows =
      await ServiceInstanceDomain.loadJoinedUserServiceKeys(parsedKeys);

    const joinedKeys = new Set(
      rows.map((row) =>
        serviceInstanceUserOrganizationKey.create({
          serviceInstanceId: row.service_instance_id,
          userId: row.user_id,
          organizationId: row.organization_id,
        })
      )
    );
    return keys.map((key) => joinedKeys.has(key));
  },

  batchLoadSubscriptions: async (
    keys: readonly OrganizationServiceInstanceKey[]
  ): Promise<SubscriptionModel[][]> => {
    const parsedKeys = keys.map(organizationServiceInstanceKey.parse);
    const serviceInstanceIds = [
      ...new Set(parsedKeys.map(({ serviceInstanceId }) => serviceInstanceId)),
    ];
    const rows =
      await ServiceInstanceDomain.loadServiceInstanceSubscriptionsByIds(
        serviceInstanceIds
      );

    // A platform admin is allowed to see every organization subscribed to a
    // service instance, so the `organizationId` part of the key is not a filter
    // for them and rows are grouped by service instance only. Every other user
    // only gets the subscriptions of the organization carried by the key.
    const isAdmin = isUserAdminPlatform(requestContext.requireUser());

    const map = new Map<string, SubscriptionModel[]>();
    for (const row of rows) {
      const groupKey = isAdmin
        ? row.service_instance_id
        : organizationServiceInstanceKey.create({
            organizationId: row.organization_id,
            serviceInstanceId: row.service_instance_id,
          });
      const existing = map.get(groupKey) ?? [];
      existing.push(row as unknown as SubscriptionModel);
      map.set(groupKey, existing);
    }

    return parsedKeys.map(({ organizationId, serviceInstanceId }) => {
      const groupKey = isAdmin
        ? serviceInstanceId
        : organizationServiceInstanceKey.create({
            organizationId,
            serviceInstanceId,
          });
      return map.get(groupKey) ?? [];
    });
  },

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

  create: (): ServiceInstanceDataLoaders => ({
    linksByServiceInstanceLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadLinks
    ),
    serviceDefinitionByServiceInstanceLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadServiceDefinitions
    ),
    organizationSubscribedLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadOrganizationSubscribed
    ),
    capabilitiesLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadCapabilities
    ),
    userJoinedLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadUserJoined
    ),
    subscriptionsByServiceInstanceLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadSubscriptions
    ),
    serviceInstanceByIdLoader: new DataLoader(
      ServiceInstanceDataLoader.batchLoadServiceInstances
    ),
  }),
};
