import { describe, expect, it, vi } from 'vitest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { SubscriptionCapabilityId } from '../../model/kanel/public/SubscriptionCapability';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDataLoader } from './subscription.dataloader';
import { SubscriptionDomain } from './subscription.domain';

describe('subscriptionDataLoader', () => {
  describe('batchLoadServiceInstances', () => {
    it('should map service instances by id and return undefined when missing', async () => {
      vi.spyOn(
        ServiceInstanceDomain,
        'loadServiceInstancesByIds'
      ).mockResolvedValue([{ id: 'instance-1' } as never]);

      const result = await SubscriptionDataLoader.batchLoadServiceInstances([
        'instance-1' as ServiceInstanceId,
        'instance-2' as ServiceInstanceId,
      ]);

      expect(
        ServiceInstanceDomain.loadServiceInstancesByIds
      ).toHaveBeenCalledWith(['instance-1', 'instance-2']);
      expect(result).toEqual([{ id: 'instance-1' }, undefined]);
    });
  });

  describe('batchLoadOrganizations', () => {
    it('should map organizations by id and return undefined when missing', async () => {
      vi.spyOn(OrganizationDomain, 'loadOrganizationsByIds').mockResolvedValue([
        { id: 'org-1' } as never,
      ]);

      const result = await SubscriptionDataLoader.batchLoadOrganizations([
        'org-1' as OrganizationId,
        'org-2' as OrganizationId,
      ]);

      expect(OrganizationDomain.loadOrganizationsByIds).toHaveBeenCalledWith([
        'org-1',
        'org-2',
      ]);
      expect(result).toEqual([{ id: 'org-1' }, undefined]);
    });
  });

  describe('batchLoadSubscriptionCapabilities', () => {
    it('should group capabilities by subscription id and return an empty array when missing', async () => {
      vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionCapabilitiesBySubscriptionIds'
      ).mockResolvedValue([
        {
          id: 'cap-1',
          subscription_id: 'sub-1',
          service_capability_id: 'service-cap-1',
        } as never,
        {
          id: 'cap-2',
          subscription_id: 'sub-1',
          service_capability_id: 'service-cap-2',
        } as never,
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
          {
            id: 'cap-1',
            subscription_id: 'sub-1',
            service_capability_id: 'service-cap-1',
          },
          {
            id: 'cap-2',
            subscription_id: 'sub-1',
            service_capability_id: 'service-cap-2',
          },
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
      ).mockResolvedValue([
        { id: 'user-service-1', subscription_id: 'sub-1' } as never,
      ]);

      const result = await SubscriptionDataLoader.batchLoadUserServices([
        'sub-1' as SubscriptionId,
        'sub-2' as SubscriptionId,
      ]);

      expect(
        SubscriptionDomain.loadUserServicesBySubscriptionIds
      ).toHaveBeenCalledWith(['sub-1', 'sub-2']);
      expect(result).toEqual([
        [{ id: 'user-service-1', subscription_id: 'sub-1' }],
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
        {
          id: 'service-cap-1',
          subscription_capability_id: 'sub-cap-1',
        } as never,
      ]);

      const result = await SubscriptionDataLoader.batchLoadServiceCapabilities([
        'sub-cap-1' as SubscriptionCapabilityId,
        'sub-cap-2' as SubscriptionCapabilityId,
      ]);

      expect(
        SubscriptionDomain.loadServiceCapabilitiesBySubscriptionCapabilityIds
      ).toHaveBeenCalledWith(['sub-cap-1', 'sub-cap-2']);
      expect(result).toEqual([
        { id: 'service-cap-1', subscription_capability_id: 'sub-cap-1' },
        undefined,
      ]);
    });
  });

  describe('create()', () => {
    it('should wire every loader to its batch function', async () => {
      const serviceInstanceSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadServiceInstances')
        .mockResolvedValue([{ id: 'instance-1' } as never]);
      const organizationSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadOrganizations')
        .mockResolvedValue([{ id: 'org-1' } as never]);
      const subscriptionCapabilitiesSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadSubscriptionCapabilities')
        .mockResolvedValue([[{ id: 'cap-1' } as never]]);
      const userServicesSpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadUserServices')
        .mockResolvedValue([[{ id: 'user-service-1' } as never]]);
      const serviceCapabilitySpy = vi
        .spyOn(SubscriptionDataLoader, 'batchLoadServiceCapabilities')
        .mockResolvedValue([{ id: 'service-cap-1' } as never]);

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
