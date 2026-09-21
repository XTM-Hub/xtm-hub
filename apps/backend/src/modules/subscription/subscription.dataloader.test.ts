import { describe, expect, it, vi } from 'vitest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import ServiceCapability, {
  ServiceCapabilityId,
} from '../../model/kanel/public/ServiceCapability';
import { ServiceDefinitionId } from '../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { SubscriptionCapabilityId } from '../../model/kanel/public/SubscriptionCapability';
import { UserId } from '../../model/kanel/public/User';
import { UserServiceId } from '../../model/kanel/public/UserService';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDataLoader } from './subscription.dataloader';
import { SubscriptionDomain } from './subscription.domain';

const buildServiceInstance = (id: string) => ({
  id: id as ServiceInstanceId,
  name: `Instance ${id}`,
  description: null,
  creation_status: null,
  public: null,
  tags: null,
  service_definition_id: 'service-definition-1' as ServiceDefinitionId,
  logo_document_id: null,
  illustration_document_id: null,
  slug: null,
  ordering: 1,
  capabilities: [],
});

const buildOrganization = (id: string) => ({
  id: id as OrganizationId,
  name: `Organization ${id}`,
  domains: null,
  personal_space: false,
});

const buildSubscriptionCapability = (
  id: string,
  subscriptionId: string,
  serviceCapabilityId: string
) => ({
  id: id as SubscriptionCapabilityId,
  subscription_id: subscriptionId as SubscriptionId,
  service_capability_id: serviceCapabilityId as ServiceCapabilityId,
});

const buildUserService = (id: string, subscriptionId: string) => ({
  id: id as UserServiceId,
  user_id: 'user-1' as UserId,
  subscription_id: subscriptionId as SubscriptionId,
  service_personal_data: null,
});

const buildServiceCapability = (
  id: string,
  subscriptionCapabilityId: string
): ServiceCapability & { subscription_capability_id: string } => ({
  id: id as ServiceCapabilityId,
  name: null,
  description: null,
  service_definition_id: null,
  subscription_capability_id: subscriptionCapabilityId,
});

describe('subscriptionDataLoader', () => {
  describe('batchLoadServiceInstances', () => {
    it('should map service instances by id and return undefined when missing', async () => {
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceInstancesByIds'
      ).mockResolvedValue([buildServiceInstance('instance-1')]);

      const result = await SubscriptionDataLoader.batchLoadServiceInstances([
        'instance-1' as ServiceInstanceId,
        'instance-2' as ServiceInstanceId,
      ]);

      expect(
        ServiceInstanceDomain.loadServiceInstancesByIds
      ).toHaveBeenCalledWith(['instance-1', 'instance-2']);
      expect(result).toEqual([buildServiceInstance('instance-1'), undefined]);
    });
  });

  describe('batchLoadOrganizations', () => {
    it('should map organizations by id and return undefined when missing', async () => {
      vi.spyOn(OrganizationDomain, 'loadOrganizationsByIds').mockResolvedValue([
        buildOrganization('org-1'),
      ]);

      const result = await SubscriptionDataLoader.batchLoadOrganizations([
        'org-1' as OrganizationId,
        'org-2' as OrganizationId,
      ]);

      expect(OrganizationDomain.loadOrganizationsByIds).toHaveBeenCalledWith([
        'org-1',
        'org-2',
      ]);
      expect(result).toEqual([buildOrganization('org-1'), undefined]);
    });
  });

  describe('batchLoadSubscriptionCapabilities', () => {
    it('should group capabilities by subscription id and return an empty array when missing', async () => {
      vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionCapabilitiesBySubscriptionIds'
      ).mockResolvedValue([
        buildSubscriptionCapability('cap-1', 'sub-1', 'service-cap-1'),
        buildSubscriptionCapability('cap-2', 'sub-1', 'service-cap-2'),
      ]);

      const result =
        await SubscriptionDataLoader.batchLoadSubscriptionCapabilities([
          'sub-1' as SubscriptionId,
          'sub-2' as SubscriptionId,
        ]);

      expect(
        SubscriptionDomain.loadSubscriptionCapabilitiesBySubscriptionIds
      ).toHaveBeenCalledWith(['sub-1', 'sub-2']);
      expect(result).toEqual([
        [
          buildSubscriptionCapability('cap-1', 'sub-1', 'service-cap-1'),
          buildSubscriptionCapability('cap-2', 'sub-1', 'service-cap-2'),
        ],
        [],
      ]);
    });
  });

  describe('batchLoadUserServices', () => {
    it('should group user services by subscription id and return an empty array when missing', async () => {
      vi.spyOn(
        SubscriptionDomain,
        'loadUserServicesBySubscriptionIds'
      ).mockResolvedValue([buildUserService('user-service-1', 'sub-1')]);

      const result = await SubscriptionDataLoader.batchLoadUserServices([
        'sub-1' as SubscriptionId,
        'sub-2' as SubscriptionId,
      ]);

      expect(
        SubscriptionDomain.loadUserServicesBySubscriptionIds
      ).toHaveBeenCalledWith(['sub-1', 'sub-2']);
      expect(result).toEqual([
        [buildUserService('user-service-1', 'sub-1')],
        [],
      ]);
    });
  });

  describe('batchLoadServiceCapabilities', () => {
    it('should map service capabilities by subscription_capability id and return undefined when missing', async () => {
      vi.spyOn(
        SubscriptionDomain,
        'loadServiceCapabilitiesBySubscriptionCapabilityIds'
      ).mockResolvedValue([
        buildServiceCapability('service-cap-1', 'sub-cap-1'),
      ]);

      const result = await SubscriptionDataLoader.batchLoadServiceCapabilities([
        'sub-cap-1' as SubscriptionCapabilityId,
        'sub-cap-2' as SubscriptionCapabilityId,
      ]);

      expect(
        SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds
      ).toHaveBeenCalledWith(['sub-cap-1', 'sub-cap-2']);
      expect(result).toEqual([
        buildServiceCapability('service-cap-1', 'sub-cap-1'),
        undefined,
      ]);
    });
  });

  describe('create()', () => {
    it('should wire every loader to its batch function', async () => {
      const serviceInstanceSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadServiceInstances')
        .mockResolvedValue([buildServiceInstance('instance-1')]);
      const organizationSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadOrganizations')
        .mockResolvedValue([buildOrganization('org-1')]);
      const subscriptionCapabilitiesSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadSubscriptionCapabilities')
        .mockResolvedValue([
          [buildSubscriptionCapability('cap-1', 'sub-1', 'service-cap-1')],
        ]);
      const userServicesSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadUserServices')
        .mockResolvedValue([[buildUserService('user-service-1', 'sub-1')]]);
      const serviceCapabilitySpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadServiceCapabilities')
        .mockResolvedValue([
          buildServiceCapability('service-cap-1', 'sub-cap-1'),
        ]);

      const loaders = SubscriptionDataLoader.create();

      await loaders.serviceInstanceBySubscriptionServiceInstanceIdLoader.load(
        'instance-1' as ServiceInstanceId
      );
      await loaders.organizationBySubscriptionOrganizationIdLoader.load(
        'org-1' as OrganizationId
      );
      await loaders.subscriptionCapabilitiesBySubscriptionIdLoader.load(
        'sub-1' as SubscriptionId
      );
      await loaders.userServicesBySubscriptionIdLoader.load(
        'sub-1' as SubscriptionId
      );
      await loaders.serviceCapabilityBySubscriptionCapabilityIdLoader.load(
        'sub-cap-1' as SubscriptionCapabilityId
      );

      expect(serviceInstanceSpy).toHaveBeenCalledWith(['instance-1']);
      expect(organizationSpy).toHaveBeenCalledWith(['org-1']);
      expect(subscriptionCapabilitiesSpy).toHaveBeenCalledWith(['sub-1']);
      expect(userServicesSpy).toHaveBeenCalledWith(['sub-1']);
      expect(serviceCapabilitySpy).toHaveBeenCalledWith(['sub-cap-1']);
    });
  });
});
