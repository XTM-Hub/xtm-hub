import { MockInstance } from '@vitest/spy';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  requestContextRegistererUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import DeploymentRequest from '../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { PortalContext } from '../../model/portal-context';
import { securityGuard } from '../../security/guard';
import { ErrorCode } from '../../utils/error/error.code';
import { DeploymentRequestDomain } from '../deployment/deployment.domain';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import {
  PlatformConfigurationInput,
  RegistrationDomain,
} from './registration.domain';

describe('registration domain', () => {
  let platformId: string;
  const token = uuidv4();
  const platformTitle = 'My OpenCTI platform';
  const platformUrl = 'http://example.com';
  const platformContract = PlatformContract.Ee;
  const serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID;
  const platformOpenCTI = '6.7.17';

  beforeEach(() => {
    platformId = uuidv4();
  });

  describe('registerNewPlatform', () => {
    it('save registration data', async () => {
      const testContext = {
        user: requestContextRegistererUserSecondOrga.user,
      };
      requestContext.set(testContext);
      await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        configuration: {
          registerer_id: contextSimpleUserSecondOrga.user.id,
          platform_id: platformId,
          platform_url: platformUrl,
          platform_title: platformTitle,
          platform_contract: platformContract,
          platform_version: platformOpenCTI,
          token,
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      const serviceInstanceFromDB = await TestHelper.serviceInstance.load({
        name: 'OpenCTI Platform',
      });

      expect(serviceInstanceFromDB).toMatchObject({
        creation_status: ServiceInstanceCreationStatus.Ready,
      });

      const subscriptionFromDB = await TestHelper.subscription.loadAll({
        service_instance_id: serviceInstanceFromDB?.id,
      });

      expect(subscriptionFromDB?.[0]).toMatchObject({
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const platformConfiguration = await TestHelper.platformConfiguration.load(
        {
          service_instance_id: serviceInstanceFromDB?.id,
        }
      );

      expect(platformConfiguration).toMatchObject({
        token,
        registerer_id: contextSimpleUserSecondOrga.user.id,
        platform_id: platformId,
        platform_title: platformTitle,
        platform_url: platformUrl,
        platform_contract: platformContract,
      });
    });
    it('can create pending platforms', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const serviceInstanceId = await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        platformIdentifier: PlatformIdentifier.Opencti,
        serviceInstanceCreationStatus: ServiceInstanceCreationStatus.Pending,
      });

      const serviceInstance = await TestHelper.serviceInstance.load({
        id: serviceInstanceId,
      });
      const subscriptionFromDB = await TestHelper.subscription.loadAll({
        service_instance_id: serviceInstanceId,
      });

      const platformConfiguration = await TestHelper.platformConfiguration.load(
        {
          service_instance_id: serviceInstanceId,
        }
      );

      expect(serviceInstance).toBeDefined();
      expect(serviceInstance?.creation_status).toBe(
        ServiceInstanceCreationStatus.Pending
      );

      expect(subscriptionFromDB?.[0]?.organization_id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );

      expect(platformConfiguration).toBeUndefined();
    });
  });

  describe('refreshExistingPlatform', () => {
    const configuration: PlatformConfigurationInput = {
      registerer_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
      platform_id: uuidv4(),
      platform_contract: PlatformContract.Ce,
      platform_title: 'Title',
      platform_url: 'https://example.com',
      platform_version: '6',
      token: uuidv4(),
      last_connectivity_check: new Date(),
    };
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const targetOrganizationId = uuidv4() as OrganizationId;

    let assertUserIsAllowedOnOrganizationSpy: MockInstance;
    let loadSubscriptionBySpy: MockInstance;
    let loadOrganizationsByUserSpy: MockInstance;
    let transferSubscriptionToOrganizationSpy: MockInstance;
    let updateConfigurationSpy: MockInstance;

    beforeEach(async () => {
      assertUserIsAllowedOnOrganizationSpy = vi.spyOn(
        securityGuard,
        'assertUserIsAllowedOnOrganization'
      );

      loadSubscriptionBySpy = vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionBy'
      );

      loadOrganizationsByUserSpy = vi.spyOn(
        OrganizationDomain,
        'loadOrganizationsByUser'
      );

      transferSubscriptionToOrganizationSpy = vi.spyOn(
        SubscriptionDomain,
        'transferSubscriptionToOrganization'
      );

      updateConfigurationSpy = vi.spyOn(
        PlatformConfigurationDomain,
        'updateConfiguration'
      );
    });

    it('should prevent refresh when user is not allowed on target organization', async () => {
      assertUserIsAllowedOnOrganizationSpy.mockReturnValue(
        Promise.reject('ERROR')
      );

      const call = RegistrationDomain.refreshExistingPlatform({
        configuration,
        serviceInstanceId,
        targetOrganizationId,
      });

      await expect(call).rejects.toThrow('ERROR');
    });

    it('should throw an error when subscription is not found', async () => {
      assertUserIsAllowedOnOrganizationSpy.mockResolvedValue({});
      loadSubscriptionBySpy.mockResolvedValue(null);

      const call = RegistrationDomain.refreshExistingPlatform({
        configuration,
        serviceInstanceId,
        targetOrganizationId,
      });

      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    describe('same target organization', () => {
      beforeEach(() => {
        loadSubscriptionBySpy.mockResolvedValue({
          organization_id: targetOrganizationId,
        });
      });

      it('should update configuration', async () => {
        assertUserIsAllowedOnOrganizationSpy.mockResolvedValue({});

        await RegistrationDomain.refreshExistingPlatform({
          configuration,
          serviceInstanceId,
          targetOrganizationId,
        });

        expect(updateConfigurationSpy).toHaveBeenCalledWith(serviceInstanceId, {
          ...configuration,
          status: PlatformConfigurationStatus.Active,
        });
      });
    });

    describe('another target organization', () => {
      const subscriptionId = uuidv4() as SubscriptionId;
      const anotherOrganizationId = uuidv4() as OrganizationId;
      beforeEach(() => {
        loadSubscriptionBySpy.mockResolvedValue({
          id: subscriptionId,
          organization_id: anotherOrganizationId,
        });
      });

      it('should throw an error when user has more than 2 organizations', async () => {
        assertUserIsAllowedOnOrganizationSpy.mockResolvedValue({});
        loadOrganizationsByUserSpy.mockResolvedValue([{}, {}, {}]);

        const call = RegistrationDomain.refreshExistingPlatform({
          configuration,
          serviceInstanceId,
          targetOrganizationId,
        });

        await expect(call).rejects.toThrow(
          ErrorCode.RegistrationOnAnotherOrganizationForbidden
        );
      });

      it('should throw an error when user is not allowed on it', async () => {
        assertUserIsAllowedOnOrganizationSpy.mockImplementation(
          (
            context: PortalContext,
            { organizationId }: { organizationId: OrganizationId }
          ) => {
            if (organizationId === targetOrganizationId) {
              return {};
            }

            throw new Error(ErrorCode.MissingCapabilityOnOrganization);
          }
        );

        const call = RegistrationDomain.refreshExistingPlatform({
          configuration,
          serviceInstanceId,
          targetOrganizationId,
        });

        await expect(call).rejects.toThrow(
          ErrorCode.MissingCapabilityOnOrganization
        );
      });

      it('should transfer the subscription and refresh configuration when user is allowed', async () => {
        assertUserIsAllowedOnOrganizationSpy.mockResolvedValue({});

        await RegistrationDomain.refreshExistingPlatform({
          configuration,
          serviceInstanceId,
          targetOrganizationId,
        });

        expect(transferSubscriptionToOrganizationSpy).toHaveBeenCalledWith({
          subscriptionId,
          organizationId: targetOrganizationId,
        });

        expect(updateConfigurationSpy).toHaveBeenCalledWith(serviceInstanceId, {
          ...configuration,
          status: PlatformConfigurationStatus.Active,
        });
      });
    });
  });

  describe('loadRegisteredPlatform', () => {
    const openAEVplatformId = uuidv4();

    const openAEVplatformTitle = 'My OpenCTI platform';
    const openAEVplatformUrl = 'http://example.com';
    const openAEVplatformContract = PlatformContract.Ee;
    const serviceDefinitionId = '5f769173-5ace-4ef3-b04f-2c95609c5b59';
    const openAEVplatformVersion = '6.7.17';
    const openAEVToken = uuidv4();
    const openAEVServiceDefinitionId = 'e66a6b50-1f92-4f62-b84c-88ed6b871790';

    let openCTIServiceInstanceId: ServiceInstanceId;
    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      openCTIServiceInstanceId = await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: platformId,
          platform_url: platformUrl,
          platform_title: platformTitle,
          platform_contract: platformContract,
          platform_version: platformOpenCTI,
          token,
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId: openAEVServiceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: openAEVplatformId,
          platform_url: openAEVplatformUrl,
          platform_title: openAEVplatformTitle,
          platform_contract: openAEVplatformContract,
          platform_version: openAEVplatformVersion,
          token: openAEVToken,
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Openaev,
      });
    });
    afterEach(async () => {
      await TestHelper.deploymentRequest.delete({});
      await PlatformConfigurationDomain.deleteConfigurationBy({});
      await ServiceInstanceDomain.deleteServiceInstanceBy({});
    });

    it('should return only the registered platform linked to the service instance', async () => {
      const platforms = await RegistrationDomain.loadRegisteredPlatform(
        openCTIServiceInstanceId
      );

      expect(platforms).toHaveLength(1);
      expect(platforms[0]?.platform_id).toBe(platformId);
    });
  });

  describe('loadAllActiveRegisteredPlatformsByPlatformIdentifier', () => {
    const openAEVServiceDefinitionId =
      SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID;
    let secondOrgServiceInstanceId: ServiceInstanceId;

    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      secondOrgServiceInstanceId = await RegistrationDomain.registerNewPlatform(
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceDefinitionId,
          configuration: {
            registerer_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
            platform_id: platformId,
            platform_url: platformUrl,
            platform_title: platformTitle,
            platform_contract: platformContract,
            platform_version: platformOpenCTI,
            token,
            last_connectivity_check: new Date(),
          },
          platformIdentifier: PlatformIdentifier.Opencti,
        }
      );
    });

    afterEach(async () => {
      await PlatformConfigurationDomain.deleteConfigurationBy({});
      if (secondOrgServiceInstanceId) {
        await ServiceInstanceDomain.deleteServiceInstanceBy({
          id: secondOrgServiceInstanceId,
        });
      }
    });

    it.each`
      description                                                | registerExtraOpenAEV
      ${'with only OpenCTI registered'}                          | ${false}
      ${'while ignoring a platform with a different identifier'} | ${true}
    `(
      'should return only the matching OpenCTI platform $description',
      async ({ registerExtraOpenAEV }: { registerExtraOpenAEV: boolean }) => {
        // Given
        if (registerExtraOpenAEV) {
          await RegistrationDomain.registerNewPlatform({
            organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            serviceDefinitionId: openAEVServiceDefinitionId,
            configuration: {
              registerer_id:
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
              platform_id: uuidv4(),
              platform_url: platformUrl,
              platform_title: platformTitle,
              platform_contract: platformContract,
              platform_version: platformOpenCTI,
              token: uuidv4(),
              last_connectivity_check: new Date(),
            },
            platformIdentifier: PlatformIdentifier.Openaev,
          });
        }

        // When
        const result =
          await RegistrationDomain.loadAllActiveRegisteredPlatformsByPlatformIdentifier(
            PlatformIdentifier.Opencti
          );

        // Then
        expect(result).toHaveLength(1);
        expect(result[0]?.platform_id).toBe(platformId);
      }
    );

    it('should return all platforms matching the identifier', async () => {
      // Given — register a second platform
      const secondPlatformId = uuidv4();
      await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: secondPlatformId,
          platform_url: platformUrl,
          platform_title: platformTitle,
          platform_contract: platformContract,
          platform_version: platformOpenCTI,
          token: uuidv4(),
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      // When
      const result =
        await RegistrationDomain.loadAllActiveRegisteredPlatformsByPlatformIdentifier(
          PlatformIdentifier.Opencti
        );

      // Then
      expect(result.some((p) => p.platform_id === platformId)).toBe(true);
      expect(result.some((p) => p.platform_id === secondPlatformId)).toBe(true);
    });

    it('should not return platforms with inactive configuration', async () => {
      // Given
      await PlatformConfigurationDomain.updateConfiguration(
        secondOrgServiceInstanceId,
        {
          status: PlatformConfigurationStatus.Inactive,
        }
      );

      // When
      const result =
        await RegistrationDomain.loadAllActiveRegisteredPlatformsByPlatformIdentifier(
          PlatformIdentifier.Opencti
        );

      // Then
      expect(result).toHaveLength(0);
    });
  });

  describe('loadRegisteredPlatforms', () => {
    const openAEVplatformId = uuidv4();

    const openAEVplatformTitle = 'My OpenCTI platform';
    const openAEVplatformUrl = 'http://example.com';
    const openAEVplatformContract = PlatformContract.Ee;
    const serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID;
    const openAEVplatformVersion = '6.7.17';
    const openAEVToken = uuidv4();
    const openAEVServiceDefinitionId = 'e66a6b50-1f92-4f62-b84c-88ed6b871790';

    let openCTIServiceInstanceId: ServiceInstanceId;
    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      openCTIServiceInstanceId = await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: platformId,
          platform_url: platformUrl,
          platform_title: platformTitle,
          platform_contract: platformContract,
          platform_version: platformOpenCTI,
          token,
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId: openAEVServiceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: openAEVplatformId,
          platform_url: openAEVplatformUrl,
          platform_title: openAEVplatformTitle,
          platform_contract: openAEVplatformContract,
          platform_version: openAEVplatformVersion,
          token: openAEVToken,
          last_connectivity_check: new Date(),
        },
        platformIdentifier: PlatformIdentifier.Openaev,
      });
    });
    afterEach(async () => {
      await TestHelper.oneClickDeployment.deleteAll();
      await TestHelper.deploymentRequest.delete({});
      await PlatformConfigurationDomain.deleteConfigurationBy({});
      await ServiceInstanceDomain.deleteServiceInstanceBy({});
    });
    it('should return all registered platform without platformIdentifier in input ', async () => {
      const platforms = await RegistrationDomain.loadRegisteredPlatforms();

      expect(
        platforms.some(
          (item) =>
            item.identifier === ServiceDefinitionIdentifier.OpenctiRegistration
        )
      ).toBe(true);
      expect(
        platforms.some(
          (item) =>
            item.identifier === ServiceDefinitionIdentifier.OpenaevRegistration
        )
      ).toBe(true);
    });
    it('should return only the right registered platform if platformIdentifier in input ', async () => {
      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Openaev,
      });
      expect(
        platforms.every(
          (item) =>
            item.identifier === ServiceDefinitionIdentifier.OpenaevRegistration
        )
      ).toBe(true);
    });
    it('should not return inactive platforms ', async () => {
      await PlatformConfigurationDomain.updateConfiguration(
        openCTIServiceInstanceId,
        {
          status: PlatformConfigurationStatus.Inactive,
        }
      );

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
      });
      expect(platforms).toHaveLength(0);
    });
    it('should return platforms without configuration (not yet auto registered) ', async () => {
      const notYetRegisteredPlatformServiceInstanceId =
        await RegistrationDomain.registerNewPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          serviceDefinitionId,
          platformIdentifier: PlatformIdentifier.Opencti,
        });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
      });
      expect(
        platforms.some(
          (item) => item.id === notYetRegisteredPlatformServiceInstanceId
        )
      ).toBe(true);
    });
    it('should return platforms with non-active trials by default', async () => {
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Cancelled,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      expect(platforms).toHaveLength(1);
      expect(platforms[0]?.platform_id).toBe(platformId);
    });
    it('should not return platforms with non-active trials when onlyActive is true', async () => {
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Provisioning,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
        onlyActive: true,
      });

      expect(platforms).toHaveLength(0);
    });
    it('should not return platforms with cancelled trials when onlyActive is true', async () => {
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Cancelled,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
        onlyActive: true,
      });

      expect(platforms).toHaveLength(0);
    });
    it('should return platforms with active trials when onlyActive is true', async () => {
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Active,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
        onlyActive: true,
      });

      expect(platforms).toHaveLength(1);
      expect(platforms[0]?.platform_id).toBe(platformId);
    });
    it('should return platforms only active trials when onlyActive is true AND onlyTrial is true', async () => {
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Active,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });
      await DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequest['id'],
        service_instance_id: openCTIServiceInstanceId,
        platform_identifier: PlatformIdentifier.Opencti,
        region: DeploymentRequestPlatformRegion.EuWest,
        type: DeploymentRequestDeploymentType.Trial,
        hub_status: DeploymentRequestHubStatus.Pending,
        platform_token: uuidv4(),
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        ordering: 1,
        request_date: new Date(),
      });
      await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId,
        platformIdentifier: PlatformIdentifier.Opencti,
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        platformIdentifier: PlatformIdentifier.Opencti,
        onlyActive: true,
        onlyTrial: true,
      });

      expect(platforms).toHaveLength(1);
      expect(platforms[0]?.platform_id).toBe(platformId);
    });
    it('should return only platforms with deployed resources when hasDeployedResources is true', async () => {
      await TestHelper.oneClickDeployment.insert({
        resource_id: uuidv4(),
        platform_id: platformId,
        tenant_id: null,
        deployed_at: new Date(),
      });

      const platforms = await RegistrationDomain.loadRegisteredPlatforms({
        hasDeployedResources: true,
      });

      const platformIds = platforms.map((platform) => platform.platform_id);
      expect(platformIds).toContain(platformId);
      expect(platformIds).not.toContain(openAEVplatformId);
    });
  });
});
