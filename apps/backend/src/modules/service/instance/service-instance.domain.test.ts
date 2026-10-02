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
  contextRegistererUserSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextRegistererUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  PlatformConfigurationStatus,
  PlatformContract,
  ServiceDefinitionIdentifier,
  ServiceInstanceTag,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import PlatformConfiguration from '../../../model/kanel/public/PlatformConfiguration';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../../model/kanel/public/ServiceInstance';
import { PlatformConfigurationInput } from '../../registration/registration.domain';
import { ServiceInstanceDomain } from './service-instance.domain';

const {
  getUserJoined,
  loadLinks,
  loadLinksByServiceInstanceIds,
  loadIsSubscribedByKeys,
  loadJoinedUserServiceKeys,
  loadPlatformConfigurationByServiceInstanceId,
  loadPlatformServiceInstance,
  loadServiceDefinitionsByServiceInstanceIds,
  loadServiceInstanceSubscriptions,
  loadServiceInstanceSubscriptionsByIds,
  loadServiceInstancesByIds,
  loadSubscribedServiceInstancesByIdentifier,
  loadSubscriptionByServiceInstanceAndOrganization,
  updatePlatformConfigurationByServiceInstanceId,
  updateServiceInstance,
  loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription,
} = ServiceInstanceDomain;

describe('service instance domain', () => {
  afterEach(async () => {
    await TestHelper.subscription.delete({});
  });

  describe('loadServiceInstancesByServiceDefinitionAndTags', () => {
    // Happy path
    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ name: 'ServiceInstance 1' });
      await TestHelper.serviceInstance.delete({ name: 'One serviceInstance' });
    });
    it('should return service instances linked to service definition and with tags', async () => {
      // When
      const serviceInstances =
        await loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription(
          ServiceDefinitionIdentifier.Link,
          [ServiceInstanceTag.OpenCti, ServiceInstanceTag.Trial]
        );
      // Then
      const names = serviceInstances.map(({ name }) => name);
      expect(names).toHaveLength(3);
      expect(names).toEqual(
        expect.arrayContaining(['Filigran Blog', 'OpenCTI 101', 'OpenCTI Demo'])
      );
    });

    it('should not return service instance linked to a subscription', async () => {
      // Given
      const linkServiceDefinition = await TestHelper.serviceDefinition.load({
        identifier: ServiceDefinitionIdentifier.Link,
      });

      const instance = await TestHelper.serviceInstance.create({
        name: 'ServiceInstance 1',
        service_definition_id: linkServiceDefinition!.id,
      });

      await TestHelper.subscription.create({
        service_instance_id: instance.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      // When
      const serviceInstances =
        await loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription(
          ServiceDefinitionIdentifier.Link,
          [ServiceInstanceTag.OpenCti, ServiceInstanceTag.Trial]
        );

      // Then
      expect(serviceInstances.map((i) => i.id)).not.toContain(instance.id);
    });

    it.each`
      title                                 | serviceDefinitionIdentifier                            | tags
      ${'from another serviceDefinition'}   | ${ServiceDefinitionIdentifier.OpenctiCustomDashboards} | ${[ServiceInstanceTag.OpenCti, ServiceInstanceTag.Trial]}
      ${'missing one of the required tags'} | ${ServiceDefinitionIdentifier.Link}                    | ${[ServiceInstanceTag.OpenCti]}
      ${'no tags'}                          | ${ServiceDefinitionIdentifier.Link}                    | ${[]}
    `(
      'should exclude instance if $title',
      async ({ serviceDefinitionIdentifier, tags }) => {
        // Given
        const serviceDefinition = await TestHelper.serviceDefinition.load({
          identifier: serviceDefinitionIdentifier,
        });

        const instance = await TestHelper.serviceInstance.create({
          name: 'One serviceInstance',
          tags: tags,
          service_definition_id: serviceDefinition.id,
        });

        // When
        const result =
          await loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription(
            ServiceDefinitionIdentifier.Link,
            [ServiceInstanceTag.OpenCti, ServiceInstanceTag.Trial]
          );

        // Then
        expect(result.map((i) => i.id)).not.toContain(instance.id);
      }
    );
  });

  describe('loadLinks', () => {
    // Happy path
    const generateId = uuidv4() as ServiceInstanceId;
    const instanceWithLinkId = uuidv4() as ServiceInstanceId;
    beforeAll(async () => {
      await TestHelper.serviceInstance.create({ id: instanceWithLinkId });
      await TestHelper.serviceLink.create({
        service_instance_id: instanceWithLinkId,
      });
    });
    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ id: generateId });
      await TestHelper.serviceLink.delete({
        service_instance_id: instanceWithLinkId,
      });
      await TestHelper.serviceInstance.delete({ id: instanceWithLinkId });
    });
    it('should return the service link when the service instance exists and has links', async () => {
      const links = await loadLinks(instanceWithLinkId);
      expect(links).toHaveLength(1);
      expect(links[0]?.service_instance_id).toBe(instanceWithLinkId);
    });

    it('should return an empty array when the service instance exists but has no links', async () => {
      // Given
      await TestHelper.serviceInstance.create({
        id: generateId,
      });
      // When
      const links = await loadLinks(generateId);
      // Then
      expect(links).toHaveLength(0);
    });

    it('should return an empty array when no links exist for the given serviceInstanceId', async () => {
      // Given
      const generateId = uuidv4();
      // When
      const links = await loadLinks(generateId);
      // Then
      expect(links).toHaveLength(0);
    });
  });

  describe('loadLinksByServiceInstanceIds', () => {
    const instanceWithLinkId = uuidv4() as ServiceInstanceId;
    beforeAll(async () => {
      await TestHelper.serviceInstance.create({ id: instanceWithLinkId });
      await TestHelper.serviceLink.create({
        service_instance_id: instanceWithLinkId,
      });
    });
    afterAll(async () => {
      await TestHelper.serviceLink.delete({
        service_instance_id: instanceWithLinkId,
      });
      await TestHelper.serviceInstance.delete({ id: instanceWithLinkId });
    });

    it('should return one row per link tagged with its service instance id and nothing for instances without links', async () => {
      // When
      const results = await loadLinksByServiceInstanceIds([
        SERVICES.INSTANCES.EPIC.ID,
        instanceWithLinkId,
      ]);

      // Then
      const epicLinks = results.filter(
        (link) => link.service_instance_id === SERVICES.INSTANCES.EPIC.ID
      );
      const instanceLinks = results.filter(
        (link) => link.service_instance_id === instanceWithLinkId
      );
      expect(epicLinks).toHaveLength(0);
      expect(instanceLinks).toHaveLength(1);
      expect(instanceLinks[0]?.service_instance_id).toBe(instanceWithLinkId);
    });
  });

  describe('loadServiceDefinitionsByServiceInstanceIds', () => {
    it('should return one row per requested service instance id, tagged accordingly', async () => {
      // When
      const results = await loadServiceDefinitionsByServiceInstanceIds([
        SERVICES.INSTANCES.INTEGRATIONS.ID,
        SERVICES.INSTANCES.EPIC.ID,
      ]);

      // Then
      expect(results).toHaveLength(2);
      const integrationsRow = results.find(
        (row) => row.service_instance_id === SERVICES.INSTANCES.INTEGRATIONS.ID
      );
      expect(integrationsRow?.id).toBe(
        SERVICES.DEFINITIONS.OPENCTI_INTEGRATIONS.ID
      );
    });
  });

  describe('loadPlatformServiceInstance', () => {
    afterAll(async () => {
      await TestHelper.serviceInstance.delete({
        name: 'Test OpenCTI Platform',
      });
      await TestHelper.serviceInstance.delete({
        name: 'Test OpenCTI Platform without subscription',
      });
    });
    it('should load platform service instance when it exists and user has subscription', async () => {
      // Given
      const serviceDefinition = await TestHelper.serviceDefinition.create();

      const serviceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: serviceDefinition.id,
        name: 'Test OpenCTI Platform',
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      // When
      const result = await loadPlatformServiceInstance(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceInstance.id
      );

      // Then
      expect(result).toBeTruthy();
      expect(result.id).toBe(serviceInstance.id);
      expect(result.name).toBe('Test OpenCTI Platform');
    });

    it('should return null when service instance does not exist', async () => {
      // Given
      const nonExistentId = uuidv4();
      // When
      const result = await loadPlatformServiceInstance(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        nonExistentId
      );
      // Then
      expect(result).toBeUndefined();
    });

    it('should return null when user has no subscription to the service', async () => {
      // Given
      const serviceDefinition = await TestHelper.serviceDefinition.create();

      const serviceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: serviceDefinition.id,
        name: 'Test OpenCTI Platform without subscription',
      });
      // When
      const result = await loadPlatformServiceInstance(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceInstance.id
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('updateServiceInstance', () => {
    let serviceInstance: ServiceInstance;
    beforeEach(async () => {
      serviceInstance = await TestHelper.serviceInstance.create({
        name: 'Original Name',
        description: 'Original Description',
        public: false,
      });
    });

    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ name: 'Original Name' });
      await TestHelper.serviceInstance.delete({ name: 'Only Name Updated' });
    });

    it('should update only provided fields', async () => {
      // When
      const updateData = {
        name: 'Only Name Updated',
        public: true,
      };

      const result = await updateServiceInstance(
        serviceInstance.id,
        updateData
      );

      // Then
      expect(result).toMatchObject({
        name: 'Only Name Updated',
        description: 'Original Description',
        public: true,
      });
    });

    it('should return undefined when service instance does not exist', async () => {
      // Given
      const nonExistentId = uuidv4();
      const updateData = { name: 'New Name' };

      // When
      const result = await updateServiceInstance(
        nonExistentId as ServiceInstanceId,
        updateData
      );
      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('loadPlatformConfigurationByServiceInstanceId', () => {
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    let platformConfiguration: PlatformConfiguration;

    beforeAll(async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });

      platformConfiguration = await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
      });
    });
    afterAll(async () => {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should load platform configuration when it exists', async () => {
      // When
      const result =
        await loadPlatformConfigurationByServiceInstanceId(serviceInstanceId);

      // Then
      expect(result).toMatchObject({
        service_instance_id: serviceInstanceId,
        registerer_id: contextRegistererUserSecondOrga.user.id,
        platform_id: platformConfiguration.platform_id,
        platform_title: 'Test Platform',
        platform_url: 'https://test.com',
        platform_contract: PlatformContract.Ee,
        platform_version: '1.0.0',
        token: platformConfiguration.token,
        status: PlatformConfigurationStatus.Active,
      });
    });

    it('should return undefined when configuration does not exist', async () => {
      // Given
      const serviceInstance = await TestHelper.serviceInstance.create({
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });

      // When
      const result = await loadPlatformConfigurationByServiceInstanceId(
        serviceInstance.id
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('updatePlatformConfigurationByServiceInstanceId', () => {
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    beforeAll(async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
      });
    });

    afterAll(async () => {
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstanceId,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should handle complete configuration replacement', async () => {
      // Given
      const newConfig: PlatformConfigurationInput = {
        registerer_id: contextRegistererUserSecondOrga.user.id,
        platform_id: uuidv4(),
        platform_title: 'Completely New Title',
        platform_url: 'https://completelynew.com',
        platform_contract: PlatformContract.Ce,
        platform_version: '3.0.0',
        token: uuidv4(),
        last_connectivity_check: new Date(),
      };

      // When
      const result = await updatePlatformConfigurationByServiceInstanceId(
        serviceInstanceId,
        newConfig
      );

      // Then
      expect(result).toMatchObject({
        ...newConfig,
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
      });
    });

    it('should update partial platform configuration', async () => {
      // Given
      const updatedConfig: Partial<PlatformConfigurationInput> = {
        platform_title: 'Updated Title',
        platform_url: 'https://updated.com',
        platform_version: '2.0.0',
        platform_contract: PlatformContract.Ce,
      };

      // When
      const result = await updatePlatformConfigurationByServiceInstanceId(
        serviceInstanceId,
        updatedConfig
      );

      // Then
      expect(result).toMatchObject({
        service_instance_id: serviceInstanceId,
        platform_title: 'Updated Title',
        platform_url: 'https://updated.com',
        platform_version: '2.0.0',
        platform_contract: PlatformContract.Ce,
        status: PlatformConfigurationStatus.Active,
      });
    });

    it('should return null when configuration does not exist', async () => {
      // Given
      const nonExistentServiceId = uuidv4();
      const updatedConfig: Partial<PlatformConfigurationInput> = {
        platform_title: 'Should Not Update',
      };

      // When
      const result = await updatePlatformConfigurationByServiceInstanceId(
        nonExistentServiceId,
        updatedConfig
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('getUserJoined', () => {
    afterAll(async () => {
      await TestHelper.user_Service.delete({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
      });
    });
    it('should return true when user subscribed to the service with the organization', async () => {
      // Given
      const subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: subscription!.id,
      });

      // When
      const result = await getUserJoined(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        SERVICES.INSTANCES.INTEGRATIONS.ID
      );

      // Then
      expect(result).toBe(true);
    });

    it('should return false when user did not subscribe to the service with the organization', async () => {
      // When
      const result = await getUserJoined(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        SERVICES.INSTANCES.INTEGRATIONS.ID
      );

      // Then
      expect(result).toBe(false);
    });
  });

  describe('loadJoinedUserServiceKeys', () => {
    afterAll(async () => {
      await TestHelper.user_Service.delete({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
      });
      await TestHelper.user_Service.delete({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
      });
    });

    it('should only return keys for which the user actually joined the service', async () => {
      // Given
      const subscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: subscription!.id,
      });

      // When
      const result = await loadJoinedUserServiceKeys([
        {
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
        {
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
      ]);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should not match a key built from the cross product of the requested keys', async () => {
      // Given
      const integrationsSubscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: integrationsSubscription!.id,
      });

      const scenariosSubscription = await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      });
      await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        subscription_id: scenariosSubscription!.id,
      });

      // When
      const result = await loadJoinedUserServiceKeys([
        {
          userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        },
        {
          userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
          organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
      ]);

      // Then
      expect(result).toEqual([]);
    });

    it('should return an empty array when no key is provided', async () => {
      // When
      const result = await loadJoinedUserServiceKeys([]);

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('loadIsSubscribedByKeys', () => {
    it('should only return keys with an actual subscription', async () => {
      // Given
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });

      // When
      const result = await loadIsSubscribedByKeys([
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
        {
          organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
      ]);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should not match a key built from the cross product of the requested keys', async () => {
      // Given
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      });

      // When
      const result = await loadIsSubscribedByKeys([
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceInstanceId: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        },
        {
          organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
          serviceInstanceId: SERVICES.INSTANCES.INTEGRATIONS.ID,
        },
      ]);

      // Then
      expect(result).toEqual([]);
    });

    it('should return an empty array when no organization or service instance ids are provided', async () => {
      // When
      const result = await loadIsSubscribedByKeys([]);

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('loadServiceInstanceSubscriptionsByIds', () => {
    it('should group subscriptions per requested service instance id', async () => {
      // Given
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      });

      requestContext.set(requestContextAdminUser);

      // When
      const result = await loadServiceInstanceSubscriptionsByIds([
        SERVICES.INSTANCES.INTEGRATIONS.ID,
        SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      ]);

      // Then
      const integrationSubscriptions = result.filter(
        (subscription) =>
          subscription.service_instance_id ===
          SERVICES.INSTANCES.INTEGRATIONS.ID
      );
      const scenarioSubscriptions = result.filter(
        (subscription) =>
          subscription.service_instance_id ===
          SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID
      );
      expect(integrationSubscriptions).toHaveLength(1);
      expect(scenarioSubscriptions).toHaveLength(1);
    });
  });

  describe('loadSubscriptionByServiceInstanceAndOrganization', () => {
    beforeEach(async () => {
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should return subscription when service instance and organization are found', async () => {
      // When
      const subscription =
        await loadSubscriptionByServiceInstanceAndOrganization(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          SERVICES.INSTANCES.INTEGRATIONS.ID
        );

      // Then
      expect(subscription).toMatchObject({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it.each`
      description           | organizationId                               | serviceInstanceId
      ${'service instance'} | ${TEST_ORGANIZATIONS.FILIGRAN.ID}            | ${SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID}
      ${'organization'}     | ${TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID} | ${SERVICES.INSTANCES.INTEGRATIONS.ID}
      ${'none'}             | ${TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID} | ${SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID}
    `(
      'should return undefined when $title is not found',
      async ({ organizationId, serviceInstanceId }) => {
        // When
        const subscription =
          await loadSubscriptionByServiceInstanceAndOrganization(
            organizationId,
            serviceInstanceId
          );

        // Then
        expect(subscription).toBeUndefined();
      }
    );
  });

  describe('loadServiceInstanceSubscriptions', () => {
    it('should return only selected organization subscription for non bypass user', async () => {
      // Given
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
      });

      requestContext.set(requestContextRegistererUserSecondOrga);

      // when
      const result = await loadServiceInstanceSubscriptions(
        SERVICES.INSTANCES.INTEGRATIONS.ID
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
    });

    it('should return all subscriptions for bypass user', async () => {
      // Given
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });
      await TestHelper.subscription.create({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });

      requestContext.set(requestContextAdminUser);

      // When
      const result = await loadServiceInstanceSubscriptions(
        SERVICES.INSTANCES.INTEGRATIONS.ID
      );

      // Then
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when service instance is not found', async () => {
      // When
      const result = await loadServiceInstanceSubscriptions(
        uuidv4() as ServiceInstanceId
      );

      // Then
      expect(result).toHaveLength(0);
    });
  });

  describe('loadServiceInstancesByIds', () => {
    const firstServiceInstanceId = uuidv4() as ServiceInstanceId;
    const secondServiceInstanceId = uuidv4() as ServiceInstanceId;

    beforeAll(async () => {
      await TestHelper.serviceInstance.create({
        id: firstServiceInstanceId,
        name: 'load-by-ids-first',
        slug: 'load-by-ids-first',
      });
      await TestHelper.serviceInstance.create({
        id: secondServiceInstanceId,
        name: 'load-by-ids-second',
        slug: 'load-by-ids-second',
      });
    });

    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ id: firstServiceInstanceId });
      await TestHelper.serviceInstance.delete({ id: secondServiceInstanceId });
    });

    it('should return an empty array without querying when no id is given', async () => {
      // When
      const result = await loadServiceInstancesByIds([]);

      // Then
      expect(result).toEqual([]);
    });

    it('should return every requested service instance', async () => {
      // When
      const result = await loadServiceInstancesByIds([
        firstServiceInstanceId,
        secondServiceInstanceId,
      ]);

      // Then
      expect(result).toHaveLength(2);
      expect(result.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          firstServiceInstanceId,
          secondServiceInstanceId,
        ])
      );
    });

    it('should return only the requested service instances', async () => {
      // When
      const result = await loadServiceInstancesByIds([firstServiceInstanceId]);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: firstServiceInstanceId,
        name: 'load-by-ids-first',
      });
    });

    it('should ignore unknown ids', async () => {
      // When
      const result = await loadServiceInstancesByIds([
        firstServiceInstanceId,
        uuidv4() as ServiceInstanceId,
      ]);

      // Then
      expect(result.map(({ id }) => id)).toEqual([firstServiceInstanceId]);
    });
  });

  describe('loadSubscribedServiceInstancesByIdentifier', () => {
    const serviceInstanceId = uuidv4() as ServiceInstanceId;

    beforeEach(async () => {
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });

      await TestHelper.subscription.create({
        service_instance_id: serviceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
    });

    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
    });

    it('should return subscribed service instances for the user', async () => {
      // When
      const result = await loadSubscribedServiceInstancesByIdentifier(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        ServiceDefinitionIdentifier.OpenctiRegistration
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        service_instance_id: serviceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
    });

    it('should return empty array if user has no subscription', async () => {
      // When
      const result = await loadSubscribedServiceInstancesByIdentifier(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE.ID,
        ServiceDefinitionIdentifier.OpenctiRegistration
      );

      // Then
      expect(result).toHaveLength(0);
    });
  });

  describe('loadServiceInstances', () => {
    const publicServiceInstanceId = uuidv4() as ServiceInstanceId;
    const privateServiceInstanceId = uuidv4() as ServiceInstanceId;

    const loadIds = async (includeInaccessible = false) => {
      const { edges } = await ServiceInstanceDomain.loadServiceInstances({
        first: 100,
        after: null,
        orderBy: 'ordering',
        orderMode: 'asc',
        searchTerm: null,
        filters: null,
        includeInaccessible,
      });
      return edges.map(({ node }) => node.id);
    };

    beforeAll(async () => {
      await TestHelper.serviceInstance.create({
        id: publicServiceInstanceId,
        name: 'accessible-public',
        slug: 'accessible-public',
        public: true,
      });
      await TestHelper.serviceInstance.create({
        id: privateServiceInstanceId,
        name: 'accessible-private',
        slug: 'accessible-private',
        public: false,
      });
    });

    afterAll(async () => {
      await TestHelper.serviceInstance.delete({ id: publicServiceInstanceId });
      await TestHelper.serviceInstance.delete({ id: privateServiceInstanceId });
    });

    it('should hide a non public service instance the organization is not subscribed to', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const ids = await loadIds();

      expect(ids).toContain(publicServiceInstanceId);
      expect(ids).not.toContain(privateServiceInstanceId);
    });

    it('should return a non public service instance to a subscribed organization', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);
      await TestHelper.subscription.create({
        service_instance_id: privateServiceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const ids = await loadIds();

      expect(ids).toContain(privateServiceInstanceId);
    });

    it('should hide a non public service instance from a platform administrator navigation', async () => {
      requestContext.set(requestContextAdminUser);

      const ids = await loadIds();

      expect(ids).toContain(publicServiceInstanceId);
      expect(ids).not.toContain(privateServiceInstanceId);
    });

    it('should return every service instance to a platform administrator asking for the admin listing', async () => {
      requestContext.set(requestContextAdminUser);

      const ids = await loadIds(true);

      expect(ids).toEqual(
        expect.arrayContaining([
          publicServiceInstanceId,
          privateServiceInstanceId,
        ])
      );
    });

    it('should ignore the admin listing flag for a non administrator', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const ids = await loadIds(true);

      expect(ids).not.toContain(privateServiceInstanceId);
    });

    it('should not expose a non public service instance on the SEO surface', async () => {
      requestContext.set(requestContextAdminUser);

      const seoInstances =
        await ServiceInstanceDomain.loadSeoServiceInstances();
      const bySlug =
        await ServiceInstanceDomain.loadSeoServiceInstanceBySlug(
          'accessible-private'
        );

      expect(seoInstances.map(({ id }) => id)).not.toContain(
        privateServiceInstanceId
      );
      expect(bySlug).toBeUndefined();
    });
  });
});
