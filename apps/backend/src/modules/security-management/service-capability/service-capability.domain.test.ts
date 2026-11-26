import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import { GenericServiceCapabilityId } from '../../../model/kanel/public/GenericServiceCapability';
import { ServiceCapabilityId } from '../../../model/kanel/public/ServiceCapability';
import ServiceDefinition, {
  ServiceDefinitionId,
} from '../../../model/kanel/public/ServiceDefinition';
import ServiceInstance from '../../../model/kanel/public/ServiceInstance';
import Subscription from '../../../model/kanel/public/Subscription';
import { SubscriptionCapabilityId } from '../../../model/kanel/public/SubscriptionCapability';
import UserService, {
  UserServiceId,
} from '../../../model/kanel/public/UserService';
import { UserServiceCapabilityId } from '../../../model/kanel/public/UserServiceCapability';
import { UserLoadUserBy } from '../../../model/user';
import { GenericServiceCapabilityIds } from './generic-service-capability.const';
import { ServiceCapabilityDomain } from './service-capability.domain';

describe('service Capability domain', () => {
  const firstCapabilityName = 'Test Capability 1';
  const secondCapabilityName = 'Test Capability 2';
  const thirdCapabilityName = 'Test Capability 3';
  const firstCapabilityDescription = 'First test capability';
  const secondCapabilityDescription = 'Second test capability';
  const nonExistentCapabilityName = 'Non-existent Capability';

  let serviceDefinition1: ServiceDefinition;
  let serviceDefinition2: ServiceDefinition;
  let testCapabilityIds: ServiceCapabilityId[] = [];
  let testServiceDefIds: ServiceDefinitionId[] = [];

  beforeAll(async () => {
    serviceDefinition1 = await TestHelper.serviceDefinition.create({
      name: 'Test Service Definition',
      description: 'Test service definition for capability tests',
    });
    serviceDefinition2 = await TestHelper.serviceDefinition.create({
      name: '2 Test Service Definition 2',
      description: '2 Test service definition for capability tests2 ',
    });
    const capabilities1 = await TestHelper.serviceCapability.create({
      name: firstCapabilityName,
      description: firstCapabilityDescription,
      service_definition_id: serviceDefinition1.id,
    });
    const capabilities2 = await TestHelper.serviceCapability.create({
      name: secondCapabilityName,
      description: secondCapabilityDescription,
      service_definition_id: serviceDefinition1.id,
    });
    const capabilities3 = await TestHelper.serviceCapability.create({
      name: thirdCapabilityName,
      description: 'Third test capability',
      service_definition_id: serviceDefinition2.id,
    });

    testCapabilityIds = [capabilities1.id, capabilities2.id, capabilities3.id];
    testServiceDefIds = [serviceDefinition1.id, serviceDefinition2.id];
  });

  afterAll(async () => {
    if (testCapabilityIds.length > 0) {
      await Promise.all(
        testCapabilityIds.map((id) =>
          TestHelper.serviceCapability.delete({ id })
        )
      );
    }

    if (testServiceDefIds.length > 0) {
      await Promise.all(
        testServiceDefIds.map((id) =>
          TestHelper.serviceDefinition.delete({ id })
        )
      );
    }
  });

  describe('loadServiceCapabilitiesBy', () => {
    it('should load service capabilities by service_definition_id', async () => {
      // Given
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesBy({
          service_definition_id: serviceDefinition1.id,
        });

      // When / Then
      expect(capabilities).toHaveLength(2);
      expect(capabilities[0]?.service_definition_id).toBe(
        serviceDefinition1.id
      );
      expect(capabilities.map((cap) => cap.name)).toContain(
        firstCapabilityName
      );
      expect(capabilities.map((cap) => cap.name)).toContain(
        secondCapabilityName
      );
    });

    it('should load service capabilities by id', async () => {
      // Given
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesBy({
          id: testCapabilityIds[0],
        });

      // When / Then
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0]?.id).toBe(testCapabilityIds[0]);
      expect(capabilities[0]?.name).toBe(firstCapabilityName);
    });

    it('should load service capabilities by name', async () => {
      // Given
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesBy({
          name: secondCapabilityName,
        });

      // When / Then
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0]?.name).toBe(secondCapabilityName);
      expect(capabilities[0]?.description).toBe(secondCapabilityDescription);
    });

    it('should return empty array when no capabilities match', async () => {
      // Given
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesBy({
          name: nonExistentCapabilityName,
        });

      // When / Then
      expect(capabilities).toHaveLength(0);
      expect(capabilities).toEqual([]);
    });

    it('should handle multiple criteria', async () => {
      // Given
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesBy({
          service_definition_id: serviceDefinition1.id,
          name: firstCapabilityName,
        });

      // When / Then
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0]?.name).toBe(firstCapabilityName);
      expect(capabilities[0]?.service_definition_id).toBe(
        serviceDefinition1.id
      );
    });
  });

  describe('loadServiceCapabilitiesByServiceId', () => {
    const mappedServiceCapabilityName = 'Mapped Service Capability';
    let serviceDefinition: ServiceDefinition;
    let serviceInstance: ServiceInstance;
    let subscription: Subscription;
    let userService: UserService;
    let mappedServiceCapabilityId: ServiceCapabilityId;
    let createdSubscriptionCapabilityId: SubscriptionCapabilityId;
    let createdUserServiceCapabilityIds: UserServiceCapabilityId[] = [];

    beforeAll(async () => {
      serviceDefinition = await TestHelper.serviceDefinition.create({
        name: 'Service Definition For Joined Capabilities',
      });
      serviceInstance = await TestHelper.serviceInstance.create({
        name: 'Service Instance For Joined Capabilities',
        service_definition_id: serviceDefinition.id,
      });
      subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstance.id,
      });
      const createdUserService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: subscription.id,
      });
      if (!createdUserService) {
        throw new Error('Expected user service to be created');
      }
      userService = createdUserService;
      const createdServiceCapability =
        await TestHelper.serviceCapability.create({
          name: mappedServiceCapabilityName,
          description: 'Capability linked to a subscription capability',
          service_definition_id: serviceDefinition.id,
        });
      mappedServiceCapabilityId = createdServiceCapability.id;

      createdSubscriptionCapabilityId = uuidv4() as SubscriptionCapabilityId;
      await TestHelper.subscriptionCapability.create({
        id: createdSubscriptionCapabilityId,
        subscription_id: subscription.id,
        service_capability_id: mappedServiceCapabilityId,
      });

      const genericUserServiceCapability =
        await TestHelper.user_ServiceCapability.create({
          id: uuidv4() as UserServiceCapabilityId,
          user_service_id: userService.id,
          generic_service_capability_id:
            GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
          subscription_capability_id: null,
        });
      const subscriptionUserServiceCapability =
        await TestHelper.user_ServiceCapability.create({
          id: uuidv4() as UserServiceCapabilityId,
          user_service_id: userService.id,
          generic_service_capability_id: null,
          subscription_capability_id: createdSubscriptionCapabilityId,
        });

      createdUserServiceCapabilityIds = [
        genericUserServiceCapability!.id,
        subscriptionUserServiceCapability!.id,
      ];
    });

    beforeEach(() => {
      requestContext.set(requestContextSimpleUserSecondOrga);
    });

    afterEach(async () => {
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: userService.id,
      });
      createdUserServiceCapabilityIds = [];
    });

    afterAll(async () => {
      if (createdUserServiceCapabilityIds.length > 0) {
        await Promise.all(
          createdUserServiceCapabilityIds.map((id) =>
            TestHelper.user_ServiceCapability.delete({ id })
          )
        );
      }
      await TestHelper.subscriptionCapability.delete({
        id: createdSubscriptionCapabilityId,
      });
      await TestHelper.serviceCapability.delete({
        id: mappedServiceCapabilityId,
      });
      await TestHelper.user_Service.delete({ id: userService.id });
      await TestHelper.subscription.delete({ id: subscription.id });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      await TestHelper.serviceDefinition.delete({ id: serviceDefinition.id });
    });

    it('should map joined data to user service capabilities when query matches service and user', async () => {
      // Given
      const serviceInstanceId = serviceInstance.id;
      const user = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE;
      const userCorrectFormat = {
        id: user.ID,
        first_name: user.FIRST_NAME,
        last_name: user.LAST_NAME,
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      } as unknown as UserLoadUserBy;

      // When
      const capabilities =
        await ServiceCapabilityDomain.loadServiceCapabilitiesByServiceId(
          serviceInstanceId,
          userCorrectFormat
        );

      // Then
      expect(capabilities).toHaveLength(2);
      expect(capabilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            user_service_id: userService.id,
            generic_service_capability: {
              id: GenericServiceCapabilityIds.ManageAccessId,
              name: 'MANAGE_ACCESS',
            },
            subscription_capability: null,
          }),
          expect.objectContaining({
            user_service_id: userService.id,
            generic_service_capability: null,
            subscription_capability: {
              id: createdSubscriptionCapabilityId,
              service_capability: {
                id: mappedServiceCapabilityId,
                name: mappedServiceCapabilityName,
              },
            },
          }),
        ])
      );
    });
  });

  describe('getManageAccessLeft', () => {
    let serviceDefinition: ServiceDefinition;
    let serviceInstance: ServiceInstance;
    let subscription: Subscription;
    let userService: UserService;
    let secondUserService: UserService;
    let createdUserServiceCapabilityIds: UserServiceCapabilityId[] = [];

    beforeAll(async () => {
      serviceDefinition = await TestHelper.serviceDefinition.create({
        name: 'Service Definition For Manage Access',
      });
      serviceInstance = await TestHelper.serviceInstance.create({
        name: 'Service Instance For Manage Access',
        service_definition_id: serviceDefinition.id,
      });
      subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstance.id,
      });
      const createdUserService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: subscription.id,
      });
      const createdSecondUserService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        subscription_id: subscription.id,
      });
      if (!createdUserService || !createdSecondUserService) {
        throw new Error('Expected user services to be created');
      }
      userService = createdUserService;
      secondUserService = createdSecondUserService;
    });

    beforeEach(() => {
      requestContext.set(requestContextSimpleUserSecondOrga);
    });

    afterEach(async () => {
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: userService.id,
      });
      await TestHelper.user_ServiceCapability.delete({
        user_service_id: secondUserService.id,
      });
      createdUserServiceCapabilityIds = [];
    });

    afterAll(async () => {
      if (createdUserServiceCapabilityIds.length > 0) {
        await Promise.all(
          createdUserServiceCapabilityIds.map((id) =>
            TestHelper.user_ServiceCapability.delete({ id })
          )
        );
      }
      await TestHelper.user_Service.delete({ id: secondUserService.id });
      await TestHelper.user_Service.delete({ id: userService.id });
      await TestHelper.subscription.delete({ id: subscription.id });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      await TestHelper.serviceDefinition.delete({ id: serviceDefinition.id });
    });

    it('should return false when only one user service has manage access in the subscription', async () => {
      // Given
      const createdCapability = await TestHelper.user_ServiceCapability.create({
        id: uuidv4() as UserServiceCapabilityId,
        user_service_id: userService.id,
        generic_service_capability_id:
          GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
        subscription_capability_id: null,
      });
      createdUserServiceCapabilityIds.push(createdCapability!.id);

      // When
      const hasManageAccessLeft =
        await ServiceCapabilityDomain.getManageAccessLeft(
          userService.id as UserServiceId
        );

      // Then
      expect(hasManageAccessLeft).toBe(false);
    });

    it('should return true when more than one user service has manage access in the subscription', async () => {
      // Given
      const firstCapability = await TestHelper.user_ServiceCapability.create({
        id: uuidv4() as UserServiceCapabilityId,
        user_service_id: userService.id,
        generic_service_capability_id:
          GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
        subscription_capability_id: null,
      });
      const secondCapability = await TestHelper.user_ServiceCapability.create({
        id: uuidv4() as UserServiceCapabilityId,
        user_service_id: secondUserService.id,
        generic_service_capability_id:
          GenericServiceCapabilityIds.ManageAccessId as GenericServiceCapabilityId,
        subscription_capability_id: null,
      });
      createdUserServiceCapabilityIds.push(
        firstCapability!.id,
        secondCapability!.id
      );

      // When
      const hasManageAccessLeft =
        await ServiceCapabilityDomain.getManageAccessLeft(userService.id);

      // Then
      expect(hasManageAccessLeft).toBe(true);
    });
  });
});
