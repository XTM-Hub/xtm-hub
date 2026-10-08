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
  CommercialModel,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  RegisteredPlatformOrdering,
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

  describe('loadRegisteredPlatformsByServiceInstanceIds', () => {
    const openAEVPlatformId = uuidv4();
    const openAEVPlatformTitle = 'My OpenAEV platform';
    const openAEVPlatformUrl = 'http://openaev.example.com';
    const openAEVPlatformContract = PlatformContract.Ee;
    const openAEVPlatformVersion = '1.0.0';
    const openAEVToken = uuidv4();
    const openAEVServiceDefinitionId =
      SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID;

    let openCTIServiceInstanceId: ServiceInstanceId;
    let openAEVServiceInstanceId: ServiceInstanceId;

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

      openAEVServiceInstanceId = await RegistrationDomain.registerNewPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        serviceDefinitionId: openAEVServiceDefinitionId,
        configuration: {
          registerer_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_id: openAEVPlatformId,
          platform_url: openAEVPlatformUrl,
          platform_title: openAEVPlatformTitle,
          platform_contract: openAEVPlatformContract,
          platform_version: openAEVPlatformVersion,
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

    it('should return the registered platforms linked to the requested service instance ids', async () => {
      const platforms =
        await RegistrationDomain.loadRegisteredPlatformsByServiceInstanceIds([
          openCTIServiceInstanceId,
          openAEVServiceInstanceId,
        ]);

      expect(platforms).toHaveLength(2);
      expect(platforms.map((platform) => platform.platform_id).sort()).toEqual(
        [platformId, openAEVPlatformId].sort()
      );
    });

    it('should not return platforms for service instance ids that were not requested', async () => {
      const platforms =
        await RegistrationDomain.loadRegisteredPlatformsByServiceInstanceIds([
          openCTIServiceInstanceId,
        ]);

      expect(platforms).toHaveLength(1);
      expect(platforms[0]?.platform_id).toBe(platformId);
    });

    it('should return an empty array when no service instance ids are requested', async () => {
      const platforms =
        await RegistrationDomain.loadRegisteredPlatformsByServiceInstanceIds(
          []
        );

      expect(platforms).toEqual([]);
    });

    it('should return an empty array when the requested service instance id does not match a registered platform', async () => {
      const platforms =
        await RegistrationDomain.loadRegisteredPlatformsByServiceInstanceIds([
          uuidv4() as ServiceInstanceId,
        ]);

      expect(platforms).toEqual([]);
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

  describe('loadSaasPlatforms', () => {
    const otherOrganizationId = uuidv4() as OrganizationId;
    const saasPlatformA = {
      serviceInstanceId: uuidv4() as ServiceInstanceId,
      platformId: uuidv4(),
      tenantId: uuidv4(),
      title: 'SaaS platform A',
      lastConnectivityCheck: new Date('2026-10-03T10:00:00.000Z'),
    };
    const saasPlatformB = {
      serviceInstanceId: uuidv4() as ServiceInstanceId,
      platformId: uuidv4(),
      tenantId: uuidv4(),
      title: 'SaaS platform B',
      lastConnectivityCheck: new Date('2026-10-01T10:00:00.000Z'),
    };
    const saasPlatformC = {
      serviceInstanceId: uuidv4() as ServiceInstanceId,
      platformId: uuidv4(),
      tenantId: uuidv4(),
      title: 'SaaS platform C',
      lastConnectivityCheck: new Date('2026-10-02T10:00:00.000Z'),
    };
    // The caller (default request context) selects FILIGRAN: A and B are only
    // subscribed by other organizations, A by two of them. Subscriptions start
    // in the listed order, so the first organization owns the platform.
    const includedPlatforms = [
      {
        ...saasPlatformA,
        organizationIds: [
          otherOrganizationId,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        ],
      },
      {
        ...saasPlatformB,
        organizationIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID],
      },
      {
        ...saasPlatformC,
        organizationIds: [TEST_ORGANIZATIONS.FILIGRAN.ID],
      },
    ];

    const excludedPlatforms = [
      {
        description: 'a non-SaaS OpenCTI platform',
        serviceInstanceId: uuidv4() as ServiceInstanceId,
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        creationStatus: ServiceInstanceCreationStatus.Ready,
        status: PlatformConfigurationStatus.Active,
        commercialModel: CommercialModel.Other,
      },
      {
        description: 'a SaaS platform of another service definition',
        serviceInstanceId: uuidv4() as ServiceInstanceId,
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
        creationStatus: ServiceInstanceCreationStatus.Ready,
        status: PlatformConfigurationStatus.Active,
        commercialModel: CommercialModel.Saas,
      },
      {
        description: 'a SaaS OpenCTI platform with a disabled service instance',
        serviceInstanceId: uuidv4() as ServiceInstanceId,
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        creationStatus: ServiceInstanceCreationStatus.Disabled,
        status: PlatformConfigurationStatus.Active,
        commercialModel: CommercialModel.Saas,
      },
      {
        description: 'an inactive SaaS OpenCTI platform',
        serviceInstanceId: uuidv4() as ServiceInstanceId,
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        creationStatus: ServiceInstanceCreationStatus.Ready,
        status: PlatformConfigurationStatus.Inactive,
        commercialModel: CommercialModel.Saas,
      },
    ];
    const createdServiceInstanceIds = [
      ...includedPlatforms.map(({ serviceInstanceId }) => serviceInstanceId),
      ...excludedPlatforms.map(({ serviceInstanceId }) => serviceInstanceId),
    ];
    const defaultArgs = {
      first: 10,
      orderBy: RegisteredPlatformOrdering.PlatformTitle,
      orderMode: OrderingMode.Asc,
    };

    beforeEach(async () => {
      await TestHelper.organization.create({
        id: otherOrganizationId,
        name: 'Other organization',
      });

      for (const platform of includedPlatforms) {
        await TestHelper.serviceInstance.create({
          id: platform.serviceInstanceId,
          service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
          creation_status: ServiceInstanceCreationStatus.Ready,
        });
        await TestHelper.platformConfiguration.create({
          service_instance_id: platform.serviceInstanceId,
          platform_id: platform.platformId,
          tenant_id: platform.tenantId,
          tenant_name: `${platform.title} tenant`,
          platform_url: 'https://saas.opencti.example.com',
          platform_title: platform.title,
          platform_version: '6.8.0',
          platform_contract: PlatformContract.Ee,
          status: PlatformConfigurationStatus.Active,
          last_connectivity_check: platform.lastConnectivityCheck,
          commercial_model: CommercialModel.Saas,
        });
        for (const [
          index,
          organizationId,
        ] of platform.organizationIds.entries()) {
          await TestHelper.subscription.create({
            organization_id: organizationId,
            service_instance_id: platform.serviceInstanceId,
            start_date: new Date(Date.UTC(2026, 0, index + 1)),
          });
        }
      }

      for (const platform of excludedPlatforms) {
        await TestHelper.serviceInstance.create({
          id: platform.serviceInstanceId,
          service_definition_id: platform.serviceDefinitionId,
          creation_status: platform.creationStatus,
        });
        await TestHelper.platformConfiguration.create({
          service_instance_id: platform.serviceInstanceId,
          status: platform.status,
          commercial_model: platform.commercialModel,
        });
        await TestHelper.subscription.create({
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          service_instance_id: platform.serviceInstanceId,
        });
      }
    });

    afterEach(async () => {
      for (const serviceInstanceId of createdServiceInstanceIds) {
        await TestHelper.subscription.delete({
          service_instance_id: serviceInstanceId,
        });
        await TestHelper.platformConfiguration.delete({
          service_instance_id: serviceInstanceId,
        });
        await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
      }
      await TestHelper.organization.delete({ id: otherOrganizationId });
    });

    it('should return every SaaS OpenCTI platform once, whatever its organization, as a connection', async () => {
      // When
      const connection =
        await RegistrationDomain.loadSaasPlatforms(defaultArgs);

      // Then
      expect(connection).toMatchObject({
        totalCount: '3',
        pageInfo: {
          startCursor: btoa('1'),
          endCursor: btoa('3'),
          hasNextPage: false,
        },
        edges: [
          { cursor: btoa('1'), node: { id: saasPlatformA.serviceInstanceId } },
          { cursor: btoa('2'), node: { id: saasPlatformB.serviceInstanceId } },
          { cursor: btoa('3'), node: { id: saasPlatformC.serviceInstanceId } },
        ],
      });
      expect(connection.edges).toHaveLength(3);
      expect(connection.edges[0]?.node).toMatchObject({
        __typename: 'RegisteredPlatform',
        id: saasPlatformA.serviceInstanceId,
        service_instance_id: saasPlatformA.serviceInstanceId,
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
        illustration_document_id: null,
        platform_id: saasPlatformA.platformId,
        tenant_id: saasPlatformA.tenantId,
        tenant_name: 'SaaS platform A tenant',
        title: 'SaaS platform A',
        url: 'https://saas.opencti.example.com',
        contract: PlatformContract.Ee,
        version: '6.8.0',
        status: PlatformConfigurationStatus.Active,
        last_connectivity_check: saasPlatformA.lastConnectivityCheck,
      });
      connection.edges.forEach(({ node }) => {
        expect(node).not.toHaveProperty('token');
        expect(node).not.toHaveProperty('registerer_id');
      });
    });

    it('should limit the page with first and return the next page with the after cursor', async () => {
      // When
      const firstPage = await RegistrationDomain.loadSaasPlatforms({
        ...defaultArgs,
        first: 2,
      });
      const secondPage = await RegistrationDomain.loadSaasPlatforms({
        ...defaultArgs,
        first: 2,
        after: firstPage.pageInfo.endCursor,
      });

      // Then
      expect(firstPage).toMatchObject({
        totalCount: '3',
        pageInfo: { endCursor: btoa('2'), hasNextPage: true },
      });
      expect(firstPage.edges.map(({ node }) => node.id)).toEqual([
        saasPlatformA.serviceInstanceId,
        saasPlatformB.serviceInstanceId,
      ]);
      expect(secondPage).toMatchObject({
        totalCount: '3',
        pageInfo: { endCursor: btoa('3'), hasNextPage: false },
      });
      expect(secondPage.edges.map(({ node }) => node.id)).toEqual([
        saasPlatformC.serviceInstanceId,
      ]);
    });

    it.each([
      {
        orderBy: RegisteredPlatformOrdering.PlatformTitle,
        orderMode: OrderingMode.Asc,
        expected: [saasPlatformA, saasPlatformB, saasPlatformC],
      },
      {
        orderBy: RegisteredPlatformOrdering.PlatformTitle,
        orderMode: OrderingMode.Desc,
        expected: [saasPlatformC, saasPlatformB, saasPlatformA],
      },
      {
        orderBy: RegisteredPlatformOrdering.LastConnectivityCheck,
        orderMode: OrderingMode.Asc,
        expected: [saasPlatformB, saasPlatformC, saasPlatformA],
      },
      {
        orderBy: RegisteredPlatformOrdering.LastConnectivityCheck,
        orderMode: OrderingMode.Desc,
        expected: [saasPlatformA, saasPlatformC, saasPlatformB],
      },
      {
        orderBy: RegisteredPlatformOrdering.OrganizationName,
        orderMode: OrderingMode.Asc,
        expected: [saasPlatformC, saasPlatformA, saasPlatformB],
      },
      {
        orderBy: RegisteredPlatformOrdering.OrganizationName,
        orderMode: OrderingMode.Desc,
        expected: [saasPlatformB, saasPlatformA, saasPlatformC],
      },
    ])(
      'should order by $orderBy $orderMode',
      async ({ orderBy, orderMode, expected }) => {
        // When
        const connection = await RegistrationDomain.loadSaasPlatforms({
          ...defaultArgs,
          orderBy,
          orderMode,
        });

        // Then
        expect(connection.edges.map(({ node }) => node.id)).toEqual(
          expected.map(({ serviceInstanceId }) => serviceInstanceId)
        );
      }
    );

    it.each(excludedPlatforms)(
      'should exclude $description',
      async ({ serviceInstanceId }) => {
        // When
        const connection =
          await RegistrationDomain.loadSaasPlatforms(defaultArgs);

        // Then
        const serviceInstanceIds = connection.edges.map(({ node }) => node.id);
        expect(serviceInstanceIds).toContain(saasPlatformA.serviceInstanceId);
        expect(serviceInstanceIds).not.toContain(serviceInstanceId);
      }
    );
  });
});
