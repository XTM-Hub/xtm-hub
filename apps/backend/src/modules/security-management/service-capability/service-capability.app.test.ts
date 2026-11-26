import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import { GenericServiceCapabilityId } from '../../../model/kanel/public/GenericServiceCapability';
import { ServiceCapabilityId } from '../../../model/kanel/public/ServiceCapability';
import { ServiceDefinitionId } from '../../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../../model/kanel/public/Subscription';
import { UserServiceId } from '../../../model/kanel/public/UserService';
import { GenericServiceCapabilityIds } from './generic-service-capability.const';
import { ServiceCapabilityApp } from './service-capability.app';
import { ServiceCapabilityDomain } from './service-capability.domain';

describe('serviceCapability app', () => {
  const serviceInstanceId = SERVICES.INSTANCES.EPIC.ID;
  const userId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID;
  const selectedOrganizationId = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;
  let createdServiceDefinitionId: ServiceDefinitionId | null = null;
  let createdServiceInstanceId: ServiceInstanceId | null = null;
  let createdSubscriptionIds: SubscriptionId[] = [];
  let createdUserServiceIds: UserServiceId[] = [];
  let createdServiceCapabilityIds: ServiceCapabilityId[] = [];

  beforeEach(() => {
    requestContext.set(requestContextSimpleUserSecondOrga);
    createdSubscriptionIds = [];
    createdUserServiceIds = [];
    createdServiceCapabilityIds = [];
    createdServiceDefinitionId = null;
    createdServiceInstanceId = null;
  });

  afterEach(async () => {
    await Promise.all(
      createdUserServiceIds.map(async (createdUserServiceId) => {
        await TestHelper.user_ServiceCapability.delete({
          user_service_id: createdUserServiceId,
        });
      })
    );
    await Promise.all(
      createdSubscriptionIds.map(async (createdSubscriptionId) => {
        await TestHelper.subscriptionCapability.delete({
          subscription_id: createdSubscriptionId,
        });
      })
    );
    await Promise.all(
      createdServiceCapabilityIds.map(async (createdServiceCapabilityId) => {
        await TestHelper.serviceCapability.delete({
          id: createdServiceCapabilityId,
        });
      })
    );
    await Promise.all(
      createdUserServiceIds.map(async (createdUserServiceId) => {
        await TestHelper.user_Service.delete({ id: createdUserServiceId });
      })
    );
    await Promise.all(
      createdSubscriptionIds.map(async (createdSubscriptionId) => {
        await TestHelper.subscription.delete({ id: createdSubscriptionId });
      })
    );
    if (createdServiceInstanceId) {
      await TestHelper.serviceInstance.delete({ id: createdServiceInstanceId });
    }
    if (createdServiceDefinitionId) {
      await TestHelper.serviceDefinition.delete({
        id: createdServiceDefinitionId,
      });
    }
    vi.restoreAllMocks();
  });

  it('should propagate domain error when loading capabilities fails', async () => {
    // Given
    const domainError = new Error('Domain failure');
    vi.spyOn(requestContext, 'requireUser').mockReturnValue({
      id: userId,
      selected_organization_id: selectedOrganizationId,
    } as unknown as ReturnType<typeof requestContext.requireUser>);
    vi.spyOn(
      ServiceCapabilityDomain,
      'loadServiceCapabilitiesByServiceId'
    ).mockRejectedValue(domainError);

    // When
    const call =
      ServiceCapabilityApp.loadServiceCapabilitiesByServiceId(
        serviceInstanceId
      );

    // Then
    await expect(call).rejects.toThrow('Domain failure');
  });

  describe('loadServiceCapabilitiesByServiceId integration', () => {
    const capabilityName = 'Service Capability app integration';

    const createServiceContext = async () => {
      const createdServiceDefinition =
        await TestHelper.serviceDefinition.create({
          name: 'service capability app definition',
        });
      createdServiceDefinitionId = createdServiceDefinition.id;

      const createdServiceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: createdServiceDefinition.id,
        name: 'service capability app instance',
      });
      createdServiceInstanceId = createdServiceInstance.id;

      return createdServiceInstance.id;
    };

    it('should return subscription id and assigned capabilities when user is subscribed with capabilities', async () => {
      // Given
      const createdServiceId = await createServiceContext();
      const createdSubscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: createdServiceId,
      });
      createdSubscriptionIds.push(createdSubscription.id);

      const createdUserService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: createdSubscription.id,
      });
      if (!createdUserService) {
        throw new Error('Expected user service to be created');
      }
      createdUserServiceIds.push(createdUserService.id);

      const createdServiceCapability =
        await TestHelper.serviceCapability.create({
          name: capabilityName,
          service_definition_id: createdServiceDefinitionId!,
        });
      createdServiceCapabilityIds.push(createdServiceCapability.id);

      const createdSubscriptionCapability =
        await TestHelper.subscriptionCapability.create({
          subscription_id: createdSubscription.id,
          service_capability_id: createdServiceCapability.id,
        });

      const createdGenericCapability =
        await TestHelper.user_ServiceCapability.create({
          user_service_id: createdUserService.id,
          generic_service_capability_id:
            GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
          subscription_capability_id: null,
        });
      const createdSubscriptionLinkedCapability =
        await TestHelper.user_ServiceCapability.create({
          user_service_id: createdUserService.id,
          generic_service_capability_id: null,
          subscription_capability_id: createdSubscriptionCapability.id,
        });
      if (!createdGenericCapability || !createdSubscriptionLinkedCapability) {
        throw new Error('Expected user service capabilities to be created');
      }

      // When
      const result =
        await ServiceCapabilityApp.loadServiceCapabilitiesByServiceId(
          createdServiceId
        );

      // Then
      expect(result.subscription_id).toBe(createdSubscription.id);
      expect(result.userServiceCapabilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            generic_service_capability: expect.objectContaining({
              id: GenericServiceCapabilityIds.ManageAccessId,
            }),
            subscription_capability: null,
          }),
          expect.objectContaining({
            generic_service_capability: null,
            subscription_capability: expect.objectContaining({
              id: createdSubscriptionCapability.id,
              service_capability: expect.objectContaining({
                id: createdServiceCapability.id,
                name: capabilityName,
              }),
            }),
          }),
        ])
      );
    });

    it('should return empty capabilities with subscription id when subscription exists but user has no capability assignment', async () => {
      // Given
      const createdServiceId = await createServiceContext();
      const createdSubscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: createdServiceId,
      });
      createdSubscriptionIds.push(createdSubscription.id);

      // When
      const result =
        await ServiceCapabilityApp.loadServiceCapabilitiesByServiceId(
          createdServiceId
        );

      // Then
      expect(result).toEqual({
        userServiceCapabilities: [],
        subscription_id: createdSubscription.id,
      });
    });

    it('should ignore subscriptions from other organizations when loading capabilities', async () => {
      // Given
      const createdServiceId = await createServiceContext();
      const createdSubscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: createdServiceId,
      });
      createdSubscriptionIds.push(createdSubscription.id);

      const createdUserService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        subscription_id: createdSubscription.id,
      });
      if (!createdUserService) {
        throw new Error('Expected user service to be created');
      }
      createdUserServiceIds.push(createdUserService.id);

      const createdGenericCapability =
        await TestHelper.user_ServiceCapability.create({
          user_service_id: createdUserService.id,
          generic_service_capability_id:
            GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
          subscription_capability_id: null,
        });
      if (!createdGenericCapability) {
        throw new Error('Expected user service capability to be created');
      }

      // When
      const result =
        await ServiceCapabilityApp.loadServiceCapabilitiesByServiceId(
          createdServiceId
        );

      // Then
      expect(result).toEqual({
        userServiceCapabilities: [],
        subscription_id: null,
      });
    });
  });
});
