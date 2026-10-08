import { MockInstance } from '@vitest/spy';
import { v4 as uuidv4 } from 'uuid';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextRegistererUserSecondOrga,
  requestContextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  DeploymentRequestUseCase,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
  PlatformRegistrationConnectivityStatus,
  PlatformRegistrationStatus,
  RegisteredPlatformConnection,
  RegisteredPlatformOrdering,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import DeploymentRequest, {
  DeploymentRequestId,
} from '../../model/kanel/public/DeploymentRequest';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';

import {
  BadRequestErrorCode,
  ErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { DeploymentRequestDomain } from '../deployment/deployment.domain';
import { AuthHelper } from '../security-management/capability/auth.helper';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import {
  TelemetryOrganizationType,
  TelemetrySource,
  TelemetryTargetProduct,
} from '../telemetry/telemetry.const';
import { TelemetryEventType } from '../telemetry/telemetry.types';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import { RegistrationApp } from './registration.app';
import { RegistrationDomain } from './registration.domain';

describe('registration app', () => {
  afterAll(async () => {
    vi.useRealTimers();
  });

  describe('loadPlatformAssociatedOrganization', () => {
    it('should return null when platform is not found', async () => {
      const result =
        await RegistrationApp.loadPlatformAssociatedOrganization(uuidv4());

      expect(result).toBeNull();
    });

    it('should throw an error when subscription is not found', async () => {
      const platformId = uuidv4();
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        status: PlatformConfigurationStatus.Active,
      });

      const call =
        RegistrationApp.loadPlatformAssociatedOrganization(platformId);

      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    it('should throw an error when user is not in the organization', async () => {
      const platformId = uuidv4();
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      const subscriptionId = uuidv4() as SubscriptionId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        status: PlatformConfigurationStatus.Active,
      });
      await TestHelper.subscription.create({
        id: subscriptionId,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        service_instance_id: serviceInstanceId,
      });
      requestContext.set(requestContextSimpleUserSecondOrga);
      const call =
        RegistrationApp.loadPlatformAssociatedOrganization(platformId);

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should throw TenantIdMandatory when platform requires tenantId and none is provided', async () => {
      const platformId = uuidv4();
      const serviceInstanceId = uuidv4() as ServiceInstanceId;

      // Use OpenAEV service definition (OpenAEV requires tenantId from v2.4.0)
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
        service_definition_id: SERVICES.DEFINITIONS.OPENAEV_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        platform_version: '2.5.0',
        status: PlatformConfigurationStatus.Active,
      });

      const call =
        RegistrationApp.loadPlatformAssociatedOrganization(platformId);
      await expect(call).rejects.toThrow(BadRequestErrorCode.TenantIdMandatory);
    });

    it('should return an organization when platform is found and user is allowed', async () => {
      const platformId = uuidv4();
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      const subscriptionId = uuidv4() as SubscriptionId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
        service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        status: PlatformConfigurationStatus.Active,
      });
      await TestHelper.subscription.create({
        id: subscriptionId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
      });

      requestContext.set(requestContextRegistererUserSecondOrga);

      const result =
        await RegistrationApp.loadPlatformAssociatedOrganization(platformId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID);
    });
  });

  describe('isPlatformRegistered', () => {
    it(`should return never registered when platform is not registered`, async () => {
      const platformId = uuidv4();
      const result = await RegistrationApp.isPlatformRegistered({
        platformId,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(PlatformRegistrationStatus.NeverRegistered);
      expect(result.organization).toBeUndefined();
      expect(result.platformTitle).toBeUndefined();
    });

    it('should throw subscription not found error when associated subscription is not found', async () => {
      const platformId = uuidv4();
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        status: PlatformConfigurationStatus.Active,
      });

      const call = RegistrationApp.isPlatformRegistered({
        platformId,
      });

      await expect(call).rejects.toThrow(ErrorCode.SubscriptionNotFound);
    });

    it('should return registered when platform registration is active', async () => {
      const platformId = uuidv4();
      const platformTitle = 'Platform title';
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      const subscriptionId = uuidv4() as SubscriptionId;

      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        platform_title: platformTitle,
        status: PlatformConfigurationStatus.Active,
      });
      await TestHelper.subscription.create({
        id: subscriptionId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
      });

      const result = await RegistrationApp.isPlatformRegistered({
        platformId,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(PlatformRegistrationStatus.Registered);
      expect(result.organization?.id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      expect(result.platformTitle).toBe(platformTitle);
    });

    it('should return unregistered when platform registration is inactive', async () => {
      const platformId = uuidv4();
      const platformTitle = 'Platform title';
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      const subscriptionId = uuidv4() as SubscriptionId;

      await TestHelper.serviceInstance.create({
        id: serviceInstanceId,
        name: 'test',
      });
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        platform_id: platformId,
        platform_title: platformTitle,
        status: PlatformConfigurationStatus.Inactive,
      });
      await TestHelper.subscription.create({
        id: subscriptionId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        service_instance_id: serviceInstanceId,
      });

      const result = await RegistrationApp.isPlatformRegistered({
        platformId,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(PlatformRegistrationStatus.Unregistered);
      expect(result.organization?.id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );
      expect(result.platformTitle).toBe(platformTitle);
    });

    describe('with tenantId', () => {
      let platformId: string;
      let tenantId: string;
      let tenantName: string;

      beforeEach(async () => {
        // Given — an OpenAEV platform registered with a specific tenantId
        requestContext.set(requestContextRegistererUserSecondOrga);
        platformId = uuidv4();
        tenantId = uuidv4();
        tenantName = 'My OpenAEV tenant';

        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '1.0.0',
            tenantId,
            tenantName,
          },
          identifier: PlatformIdentifier.Openaev,
        });
      });

      it.each`
        description               | getTenantId       | expectedStatus
        ${'matching tenantId'}    | ${() => tenantId} | ${PlatformRegistrationStatus.Registered}
        ${'a different tenantId'} | ${() => uuidv4()} | ${PlatformRegistrationStatus.NeverRegistered}
      `(
        'should return $expectedStatus when queried with $description',
        async ({
          getTenantId,
          expectedStatus,
        }: {
          getTenantId: () => string;
          expectedStatus: PlatformRegistrationStatus;
        }) => {
          // When
          const result = await RegistrationApp.isPlatformRegistered({
            platformId,
            tenantId: getTenantId(),
          });

          // Then
          expect(result).toMatchObject({ status: expectedStatus });
        }
      );
    });
  });

  describe('registerPlatform', () => {
    const platform: PlatformInput = {
      id: uuidv4(),
      title: 'My OpenCTI platform',
      url: 'http://example.com',
      contract: PlatformContract.Ee,
      version: '1.0.0',
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('invalid configuration', async () => {
      it('should throw when platformId is not valid', async () => {
        const call = RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...platform,
            id: 'hello',
          },
          identifier: PlatformIdentifier.Opencti,
        });

        await expect(call).rejects.toThrow(
          ErrorCode.InvalidPlatformConfiguration
        );
      });

      it('should throw when platformUrl is not valid', async () => {
        const call = RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...platform,
            url: 'hello',
          },
          identifier: PlatformIdentifier.Opencti,
        });

        await expect(call).rejects.toThrow(
          ErrorCode.InvalidPlatformConfiguration
        );
      });

      it('should throw when platform version is not a valid semantic version', async () => {
        const call = RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...platform,
            version: '9.Y.Z',
          },
          identifier: PlatformIdentifier.Opencti,
        });

        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidPlatformVersion
        );
      });
    });

    it('should throw when user does not belong to the organization', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);
      const call = RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should throw when user does not have the required capabilities', async () => {
      requestContext.set(requestContextSimpleUserSecondOrga);
      const call = RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('return token when platform is registered', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      expect(token).toBeDefined();
    });

    it.each`
      platformName                  | telemetryProduct
      ${PlatformIdentifier.Opencti} | ${TelemetryTargetProduct.OPEN_CTI}
      ${PlatformIdentifier.Openaev} | ${TelemetryTargetProduct.OPEN_AEV}
    `(
      'should send a telemetry event when $platformName platform is registered',
      async ({ platformName, telemetryProduct }) => {
        requestContext.set(requestContextRegistererUserSecondOrga);

        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);
        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform,
          identifier: platformName,
        });

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.REGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_contract: 'EE',
          platform_version: '1.0.0',
          platform_id: platform.id,
          platform_url: platform.url,
          target_product: telemetryProduct,
          organization_type: 'Professional',
        });
      }
    );

    it('should include tenant_id in register event when tenantId is provided', async () => {
      vi.useFakeTimers();
      requestContext.set(requestContextRegistererUserSecondOrga);

      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      const tenantId = uuidv4();
      const tenantName = 'My OpenAEV tenant';
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: { ...platform, tenantId, tenantName },
        identifier: PlatformIdentifier.Openaev,
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.REGISTER,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        platform_contract: 'EE',
        platform_version: '1.0.0',
        platform_id: platform.id,
        platform_url: platform.url,
        target_product: TelemetryTargetProduct.OPEN_AEV,
        organization_type: 'Professional',
        tenant_id: tenantId,
      });
    });

    describe('with tenantId', () => {
      beforeEach(() => {
        requestContext.set(requestContextRegistererUserSecondOrga);
      });

      it('should store tenant_id and tenant_name in the config when  provided', async () => {
        // Given
        const platformId = uuidv4();
        const tenantId = uuidv4();
        const tenantName = 'My OpenAEV tenant';

        // When
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '1.0.0',
            tenantId,
            tenantName,
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // Then
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );
        expect(configuration).toMatchObject({
          platform_id: platformId,
          tenant_id: tenantId,
          tenant_name: tenantName,
        });
      });

      it('should not store tenant_id in the config when tenantId is absent', async () => {
        // Given
        const platformId = uuidv4();

        // When
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '1.0.0',
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // Then
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId
          );
        expect(configuration?.tenant_id).toBeNull();
        expect(configuration?.tenant_name).toBeNull();
      });

      it('should create separate service instances for the same platform_id with different tenantId values', async () => {
        // Given
        const platformId = uuidv4();
        const tenantId1 = uuidv4();
        const tenantId2 = uuidv4();
        const tenantName1 = 'Tenant One';
        const tenantName2 = 'Tenant Two';
        const basePlatform = {
          id: platformId,
          title: 'My OpenAEV platform',
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          version: '1.0.0',
        };

        // When
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...basePlatform,
            tenantId: tenantId1,
            tenantName: tenantName1,
          },
          identifier: PlatformIdentifier.Openaev,
        });
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...basePlatform,
            tenantId: tenantId2,
            tenantName: tenantName2,
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // Then
        const config1 =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId: tenantId1 }
          );
        const config2 =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId: tenantId2 }
          );
        expect(config1).toMatchObject({
          platform_id: platformId,
          tenant_id: tenantId1,
          tenant_name: tenantName1,
        });
        expect(config2).toMatchObject({
          platform_id: platformId,
          tenant_id: tenantId2,
          tenant_name: tenantName2,
        });
        expect(config1?.service_instance_id).not.toBe(
          config2?.service_instance_id
        );
      });

      it('should re-register the same service instance when (platform_id, tenantId) already exists', async () => {
        // Given
        const platformId = uuidv4();
        const tenantId = uuidv4();
        const tenantName = 'My OpenAEV tenant';
        const openaevPlatform = {
          id: platformId,
          title: 'My OpenAEV platform',
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          version: '1.0.0',
          tenantId,
          tenantName,
        };
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: openaevPlatform,
          identifier: PlatformIdentifier.Openaev,
        });
        const firstConfig =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );

        // When — register again with the same (platform_id, tenantId)
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            ...openaevPlatform,
            title: 'Updated title',
            tenantName: 'newTenant',
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // Then — same service instance is reused, title is updated
        const secondConfig =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );
        expect(secondConfig?.service_instance_id).toBe(
          firstConfig?.service_instance_id
        );
        expect(secondConfig).toMatchObject({
          platform_title: 'Updated title',
          tenant_name: 'newTenant',
        });
      });
    });

    describe('tenantId mandatory validation', () => {
      beforeEach(() => {
        requestContext.set(requestContextRegistererUserSecondOrga);
      });

      it.each`
        version    | description
        ${'2.4.0'} | ${'exact threshold'}
        ${'2.4.1'} | ${'just above threshold'}
        ${'3.0.0'} | ${'major version above threshold'}
      `(
        'should throw TENANT_ID_MANDATORY for OpenAEV $description ($version) without tenantId',
        async ({ version }: { version: string }) => {
          const call = RegistrationApp.registerPlatform({
            organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            platform: {
              id: uuidv4(),
              title: 'My OpenAEV platform',
              url: 'http://example.com',
              contract: PlatformContract.Ee,
              version,
            },
            identifier: PlatformIdentifier.Openaev,
          });

          await expect(call).rejects.toThrow(
            BadRequestErrorCode.TenantIdMandatory
          );
        }
      );

      it.each`
        version    | description
        ${'2.3.9'} | ${'just below threshold'}
        ${'1.0.0'} | ${'old version'}
      `(
        'should not throw TENANT_ID_MANDATORY for OpenAEV $description ($version) without tenantId',
        async ({ version }: { version: string }) => {
          const call = RegistrationApp.registerPlatform({
            organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            platform: {
              id: uuidv4(),
              title: 'My OpenAEV platform',
              url: 'http://example.com',
              contract: PlatformContract.Ee,
              version,
            },
            identifier: PlatformIdentifier.Openaev,
          });

          await expect(call).resolves.toBeDefined();
        }
      );

      it('should not throw TENANT_ID_MANDATORY for OpenCTI regardless of version', async () => {
        const call = RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: uuidv4(),
            title: 'My OpenCTI platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '2.4.0',
          },
          identifier: PlatformIdentifier.Opencti,
        });

        await expect(call).resolves.toBeDefined();
      });

      it('should throw TENANT_ID_MANDATORY when re-registering a tenanted platform without tenantId', async () => {
        // Given — platform already registered with a tenantId (new client)
        const platformId = uuidv4();
        const tenantId = uuidv4();
        const tenantName = 'My OpenAEV tenant';
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '2.4.0',
            tenantId,
            tenantName,
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // When — re-register without tenantId (legacy client below threshold)
        const call = RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '2.2.0',
          },
          identifier: PlatformIdentifier.Openaev,
        });

        await expect(call).rejects.toThrow(
          BadRequestErrorCode.TenantIdMandatory
        );
      });

      it('should succeed when upgrading a legacy platform (no tenantId) to a version that requires it, with tenantId provided', async () => {
        // Given — platform registered with a pre-tenant version (below threshold, no tenantId)
        const platformId = uuidv4();
        const tenantId = uuidv4();
        const tenantName = 'My OpenAEV tenant';
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '2.3.9',
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // When — re-register after upgrade to a version that requires tenantId, with tenantId provided
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: {
            id: platformId,
            title: 'My OpenAEV platform',
            url: 'http://example.com',
            contract: PlatformContract.Ee,
            version: '2.4.0',
            tenantId,
            tenantName,
          },
          identifier: PlatformIdentifier.Openaev,
        });

        // Then — the new configuration has tenant_id stored
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );
        expect(configuration).toMatchObject({
          tenant_id: tenantId,
          status: PlatformConfigurationStatus.Active,
        });
      });
    });
  });

  describe('unregisterPlatform', () => {
    let platformId: string;
    let platform: PlatformInput;

    beforeEach(() => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      platformId = uuidv4();
      platform = {
        id: platformId,
        title: 'My OpenCTI platform',
        url: 'http://example.com',
        contract: PlatformContract.Ee,
        version: '1.0.0',
      };
    });

    it('should throw when user does not belong to the organization', async () => {
      requestContext.set(requestContextAdminUser);

      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });
      requestContext.set(requestContextRegistererUserSecondOrga);

      const call = RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Opencti,
      });

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should throw when user does not have the required capabilities', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      requestContext.set(requestContextSimpleUserSecondOrga);
      const call = RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Opencti,
      });

      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should throw when identifier is not the right type', async () => {
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      const call = RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Openaev,
      });

      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformIdentifier);
    });

    it('should unregister platform when the platform is still active', async () => {
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform,
        identifier: PlatformIdentifier.Opencti,
      });

      await RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Opencti,
      });

      const platformConfiguration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId
        );

      expect(platformConfiguration).toBeDefined();
      expect(platformConfiguration?.status).toBe(
        PlatformConfigurationStatus.Inactive
      );

      const subscription = await TestHelper.subscription.load({
        service_instance_id: platformConfiguration!.service_instance_id,
      });

      expect(subscription).toBeDefined();
      expect(subscription?.end_date).toBeDefined();
    });

    describe('telemetry', () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      it('should send an unregister telemetry event when the platform is unregistered', async () => {
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform,
          identifier: PlatformIdentifier.Opencti,
        });

        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);
        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        await RegistrationApp.unregisterPlatform({
          platformId,
          identifier: PlatformIdentifier.Opencti,
        });

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UNREGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_contract: PlatformContract.Ee,
          platform_version: '1.0.0',
          platform_id: platformId,
          platform_url: platform.url,
          target_product: TelemetryTargetProduct.OPEN_CTI,
        });
      });

      it('should include tenant_id in the unregister event when the platform is tenanted', async () => {
        const tenantId = uuidv4();
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: { ...platform, tenantId, tenantName: 'My OpenAEV tenant' },
          identifier: PlatformIdentifier.Openaev,
        });

        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);
        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        await RegistrationApp.unregisterPlatform({
          platformId,
          identifier: PlatformIdentifier.Openaev,
          tenantId,
        });

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UNREGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          platform_contract: PlatformContract.Ee,
          platform_version: '1.0.0',
          platform_id: platformId,
          platform_url: platform.url,
          target_product: TelemetryTargetProduct.OPEN_AEV,
          tenant_id: tenantId,
        });
      });

      it('should not fail the unregistration when telemetry emission fails', async () => {
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform,
          identifier: PlatformIdentifier.Opencti,
        });

        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockRejectedValue(new Error('telemetry unavailable'));

        await expect(
          RegistrationApp.unregisterPlatform({
            platformId,
            identifier: PlatformIdentifier.Opencti,
          })
        ).resolves.toBeUndefined();

        expect(telemetrySpy).toHaveBeenCalledOnce();
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId
          );
        expect(configuration?.status).toBe(
          PlatformConfigurationStatus.Inactive
        );
      });
    });

    describe('with tenantId', () => {
      let tenantId: string;

      beforeEach(async () => {
        // Given — an OpenAEV platform registered with a specific tenantId
        tenantId = uuidv4();
        await RegistrationApp.registerPlatform({
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform: { ...platform, tenantId, tenantName: 'My OpenAEV tenant' },
          identifier: PlatformIdentifier.Openaev,
        });
      });

      it('should set the specific tenant configuration to inactive', async () => {
        // When
        await RegistrationApp.unregisterPlatform({
          platformId,
          identifier: PlatformIdentifier.Openaev,
          tenantId,
        });

        // Then
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );
        expect(configuration).toMatchObject({
          status: PlatformConfigurationStatus.Inactive,
        });
      });

      it('should not unregister when tenantId does not match any active configuration', async () => {
        // When
        await RegistrationApp.unregisterPlatform({
          platformId,
          identifier: PlatformIdentifier.Openaev,
          tenantId: uuidv4(),
        });

        // Then — original tenant configuration is still active
        const configuration =
          await PlatformConfigurationDomain.loadConfigurationByPlatform(
            platformId,
            { tenantId }
          );
        expect(configuration).toMatchObject({
          status: PlatformConfigurationStatus.Active,
        });
      });
    });

    it('should throw TENANT_ID_MANDATORY when unregistering a tenanted platform without providing tenantId', async () => {
      // Given — an OpenAEV platform registered with a tenantId
      const tenantId = uuidv4();
      await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: { ...platform, tenantId, tenantName: 'My OpenAEV tenant' },
        identifier: PlatformIdentifier.Openaev,
      });

      // When
      const call = RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Openaev,
        // no tenantId
      });

      // Then
      await expect(call).rejects.toThrow(BadRequestErrorCode.TenantIdMandatory);
    });
  });

  describe('canUnregisterPlatform', () => {
    const platformId = uuidv4();

    let isUserAllowedOnOrganizationSpy: MockInstance;
    let loadResolvedConfigurationByPlatformSpy: MockInstance;
    let loadSubscriptionBySpy: MockInstance;

    const buildResolved = (overrides = {}) => ({
      platformConfiguration: { service_instance_id: uuidv4() },
      serviceDefinition: {
        id: uuidv4(),
        identifier: ServiceDefinitionIdentifier.OpenctiRegistration,
      },
      platformIdentifier: PlatformIdentifier.Opencti,
      ...overrides,
    });

    beforeEach(() => {
      isUserAllowedOnOrganizationSpy = vi.spyOn(
        AuthHelper,
        'isUserAllowedOnOrganization'
      );
      loadResolvedConfigurationByPlatformSpy = vi.spyOn(
        PlatformConfigurationDomain,
        'loadResolvedConfigurationByPlatform'
      );
      loadSubscriptionBySpy = vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionBy'
      );
    });

    it('should throw an error when configuration for platform does not exist', async () => {
      loadResolvedConfigurationByPlatformSpy.mockReturnValue(
        Promise.resolve(undefined)
      );

      const call = RegistrationApp.canUnregisterPlatform({
        platformId,
      });

      await expect(call).rejects.toThrow(ErrorCode.PlatformNotRegistered);
    });

    it('should throw an error when subscription does not exist', async () => {
      loadResolvedConfigurationByPlatformSpy.mockReturnValue(
        Promise.resolve(buildResolved())
      );
      loadSubscriptionBySpy.mockReturnValue(Promise.resolve(null));

      const call = RegistrationApp.canUnregisterPlatform({
        platformId,
      });

      await expect(call).rejects.toThrow(ErrorCode.PlatformNotRegistered);
    });

    it('should allow user to register when he has the required capabilities', async () => {
      const organizationId = uuidv4();
      isUserAllowedOnOrganizationSpy.mockReturnValue(
        Promise.resolve({ isAllowed: true })
      );
      loadResolvedConfigurationByPlatformSpy.mockReturnValue(
        Promise.resolve(buildResolved())
      );
      loadSubscriptionBySpy.mockReturnValue(
        Promise.resolve({ organization_id: organizationId })
      );

      const result = await RegistrationApp.canUnregisterPlatform({
        platformId,
      });

      expect(result.isAllowed).toBeTruthy();
      expect(result.organizationId).toBe(organizationId);
    });

    it('should not allow user to register when he does not have the required capabilities', async () => {
      const organizationId = uuidv4();
      loadResolvedConfigurationByPlatformSpy.mockReturnValue(
        Promise.resolve(buildResolved())
      );
      loadSubscriptionBySpy.mockReturnValue(
        Promise.resolve({ organization_id: organizationId })
      );
      isUserAllowedOnOrganizationSpy.mockReturnValue(
        Promise.resolve({ isAllowed: false, isInOrganization: false })
      );

      const result = await RegistrationApp.canUnregisterPlatform({
        platformId,
      });

      expect(result.isAllowed).toBeFalsy();
      expect(result.isInOrganization).toBeFalsy();
      expect(result.organizationId).toBe(organizationId);
    });
  });

  describe('loadPlatformRegistrationStatus', () => {
    beforeEach(() => {
      requestContext.set(requestContextRegistererUserSecondOrga);
    });
    it('should return inactive when platform is not registered', async () => {
      const result = await RegistrationApp.loadPlatformRegistrationStatus({
        platformId: uuidv4(),
        token: uuidv4(),
      });

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
    });

    it('should return active when platform is registered', async () => {
      const platformId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Opencti,
      });

      const result = await RegistrationApp.loadPlatformRegistrationStatus({
        platformId,
        token,
      });

      expect(result.status).toBe(PlatformRegistrationConnectivityStatus.Active);
    });

    it('should return inactive when platform is unregistered', async () => {
      const platformId = uuidv4();
      const token = await RegistrationApp.registerPlatform({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform: {
          id: platformId,
          url: 'http://example.com',
          contract: PlatformContract.Ee,
          title: 'Fake title',
          version: '1.0.0',
        },
        identifier: PlatformIdentifier.Opencti,
      });

      await RegistrationApp.unregisterPlatform({
        platformId,
        identifier: PlatformIdentifier.Opencti,
      });

      const result = await RegistrationApp.loadPlatformRegistrationStatus({
        platformId: platformId,
        token,
      });

      expect(result.status).toBe(
        PlatformRegistrationConnectivityStatus.Inactive
      );
    });
  });

  describe('refreshUserPlatformToken', () => {
    it('should generate a token and add it to the user each time it is called', async () => {
      requestContext.set(requestContextAdminUser);
      const { token } = await RegistrationApp.refreshUserPlatformToken(
        contextBypassUser.user.id
      );
      const user = await TestHelper.user.load({
        id: contextBypassUser.user.id,
      });

      expect(token).toBe(user.platform_token);

      const { token: anotherToken } =
        await RegistrationApp.refreshUserPlatformToken(
          contextBypassUser.user.id
        );
      const updatedUser = await TestHelper.user.load({
        id: contextBypassUser.user.id,
      });

      expect(anotherToken).toBe(updatedUser.platform_token);
      expect(anotherToken === token).toBeFalsy();
    });
  });

  describe('autoRegisterPlatform', () => {
    let deploymentRequest: DeploymentRequest;
    const platformConfiguration = {
      id: uuidv4(),
      title: 'My OpenCTI platform',
      url: 'http://example.com',
      contract: PlatformContract.Trial,
      version: '1.0.0',
    };

    beforeEach(async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const serviceInstanceId = await RegistrationDomain.registerNewPlatform({
        serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platformIdentifier: PlatformIdentifier.Opencti,
        serviceInstanceCreationStatus: ServiceInstanceCreationStatus.Pending,
      });

      deploymentRequest =
        (await DeploymentRequestDomain.insertDeploymentRequest({
          activity_sector: DeploymentRequestActivitySector.ComputerGames,
          id: uuidv4() as DeploymentRequestId,
          job_title: DeploymentRequestJobTitle.CLevel,
          organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platform_identifier: PlatformIdentifier.Opencti,
          platform_token: uuidv4(),
          region: DeploymentRequestPlatformRegion.UsEast,
          request_date: new Date(Date.UTC(2025, 1, 3, 13, 12, 15)),
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
          actual_state: DeploymentRequestPlatformState.Provisioning,
          ordering: 1,
          type: DeploymentRequestDeploymentType.Trial,
          use_case: DeploymentRequestUseCase.ThreatHunting,
          service_instance_id: serviceInstanceId as ServiceInstanceId,
          user_requester_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        })) as DeploymentRequest;
    });
    afterEach(async () => {
      await DeploymentRequestDomain.deleteDeploymentRequestBy({});
      await PlatformConfigurationDomain.deleteConfigurationBy({});
      await ServiceInstanceDomain.deleteServiceInstanceBy({});
    });
    it('should throw if deployment request is not found', async () => {
      const call = RegistrationApp.autoRegisterPlatform(uuidv4(), {
        platform: platformConfiguration,
      });
      await expect(call).rejects.toThrow(
        NotFoundErrorCode.DeploymentRequestNotFound
      );
    });
    it('should throw if wrong platform id is provided', async () => {
      await DeploymentRequestDomain.updateDeploymentRequestById(
        deploymentRequest.id,
        { platform_id: uuidv4() }
      );

      const call = RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: { ...platformConfiguration, id: uuidv4() } }
      );
      await expect(call).rejects.toThrow(BadRequestErrorCode.InvalidPlatformId);
    });
    it('should throw if deployment status is not authorized', async () => {
      await DeploymentRequestDomain.updateDeploymentRequestById(
        deploymentRequest.id,
        {
          hub_status: DeploymentRequestHubStatus.Queued,
          target_state: undefined,
          actual_state: undefined,
        }
      );

      const call = RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: platformConfiguration }
      );
      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.NotAllowedByDeploymentStatus
      );
    });
    it('should register the provided platform', async () => {
      await RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: platformConfiguration }
      );

      const serviceInstance: ServiceInstance =
        await ServiceInstanceDomain.loadServiceInstanceBy({
          id: deploymentRequest.service_instance_id,
        });
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformConfiguration.id
        );
      expect(serviceInstance.creation_status).toBe(
        ServiceInstanceCreationStatus.Ready
      );
      expect(configuration).toMatchObject({
        platform_contract: platformConfiguration.contract,
        platform_id: platformConfiguration.id,
        platform_title: platformConfiguration.title,
        platform_url: platformConfiguration.url,
        platform_version: platformConfiguration.version,
        registerer_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        token: deploymentRequest.platform_token,
        service_instance_id: deploymentRequest.service_instance_id,
        status: PlatformConfigurationStatus.Active,
      });
    });
    it("should successfully register the provided platform if it's already registered", async () => {
      const newPlatformConfiguration = {
        id: uuidv4(),
        title: 'My New OpenCTI platform',
        url: 'http://example2.com',
        contract: PlatformContract.Trial,
        version: 'A.B.C',
      };
      await RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: platformConfiguration }
      );

      await RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: newPlatformConfiguration }
      );

      const oldConfiguration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformConfiguration.id
        );
      const newConfiguration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          newPlatformConfiguration.id
        );
      expect(oldConfiguration).toBeUndefined();
      expect(newConfiguration).toMatchObject({
        platform_contract: newPlatformConfiguration.contract,
        platform_id: newPlatformConfiguration.id,
        platform_title: newPlatformConfiguration.title,
        platform_url: newPlatformConfiguration.url,
        platform_version: newPlatformConfiguration.version,
        registerer_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        token: deploymentRequest.platform_token,
        service_instance_id: deploymentRequest.service_instance_id,
        status: PlatformConfigurationStatus.Active,
      });
    });

    describe('telemetry', () => {
      it('should send register event when platform is autoregistered', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        await RegistrationApp.autoRegisterPlatform(
          deploymentRequest.platform_token as string,
          { platform: platformConfiguration }
        );

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.REGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          platform_contract: PlatformContract.Trial,
          platform_id: platformConfiguration.id,
          platform_version: platformConfiguration.version,
          platform_url: platformConfiguration.url,
          source: TelemetrySource.XTMHUB,
          target_product: 'open-cti',
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
        });
      });

      it('should include existing_users_count in register event when provided', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        await RegistrationApp.autoRegisterPlatform(
          deploymentRequest.platform_token as string,
          { platform: platformConfiguration, existing_users_count: 42 }
        );

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.REGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          platform_contract: PlatformContract.Trial,
          platform_id: platformConfiguration.id,
          platform_version: platformConfiguration.version,
          platform_url: platformConfiguration.url,
          source: TelemetrySource.XTMHUB,
          target_product: 'open-cti',
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          existing_users_count: 42,
        });
      });

      it('should include tenant_id in register event when tenantId is provided', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        const serviceInstanceId = await RegistrationDomain.registerNewPlatform({
          serviceDefinitionId: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          platformIdentifier: PlatformIdentifier.Openaev,
          serviceInstanceCreationStatus: ServiceInstanceCreationStatus.Pending,
        });

        deploymentRequest =
          (await DeploymentRequestDomain.insertDeploymentRequest({
            activity_sector: DeploymentRequestActivitySector.ComputerGames,
            id: uuidv4() as DeploymentRequestId,
            job_title: DeploymentRequestJobTitle.CLevel,
            organization_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            platform_identifier: PlatformIdentifier.Openaev,
            platform_token: uuidv4(),
            region: DeploymentRequestPlatformRegion.UsEast,
            request_date: new Date(Date.UTC(2025, 1, 3, 13, 12, 15)),
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Provisioning,
            ordering: 1,
            type: DeploymentRequestDeploymentType.Trial,
            use_case: DeploymentRequestUseCase.ThreatHunting,
            service_instance_id: serviceInstanceId as ServiceInstanceId,
            user_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          })) as DeploymentRequest;

        const telemetrySpy = vi
          .spyOn(TelemetryApp, 'sendTelemetryEvent')
          .mockResolvedValue();

        const openaevPlatformConfiguration = {
          id: uuidv4(),
          title: 'My OpenAEV platform',
          url: 'http://example.com',
          contract: PlatformContract.Trial,
          version: '4.4.2',
          tenantId: uuidv4(),
          tenantName: 'My OpenAEV tenant',
        };
        await RegistrationApp.autoRegisterPlatform(
          deploymentRequest.platform_token as string,
          { platform: openaevPlatformConfiguration }
        );

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.REGISTER,
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          platform_contract: PlatformContract.Trial,
          platform_id: openaevPlatformConfiguration.id,
          platform_version: openaevPlatformConfiguration.version,
          platform_url: openaevPlatformConfiguration.url,
          source: TelemetrySource.XTMHUB,
          target_product: TelemetryTargetProduct.OPEN_AEV,
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.ID,
          tenant_id: openaevPlatformConfiguration.tenantId,
        });
      });
    });

    it('should store tenant_id and tenant_name in the config when provided', async () => {
      // Given
      const tenantId = uuidv4();
      const tenantName = 'My OpenAEV tenant';

      // When
      await RegistrationApp.autoRegisterPlatform(
        deploymentRequest.platform_token as string,
        { platform: { ...platformConfiguration, tenantId, tenantName } }
      );

      // Then
      const configuration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformConfiguration.id,
          { tenantId }
        );
      expect(configuration).toMatchObject({
        platform_id: platformConfiguration.id,
        tenant_id: tenantId,
        tenant_name: tenantName,
        service_instance_id: deploymentRequest.service_instance_id,
        status: PlatformConfigurationStatus.Active,
      });
    });
  });

  describe('loadSaasPlatforms', () => {
    it('should return the connection paginated by the domain', async () => {
      // Given
      const args = {
        first: 10,
        after: btoa('10'),
        orderBy: RegisteredPlatformOrdering.LastConnectivityCheck,
        orderMode: OrderingMode.Desc,
      };
      const connection = {
        totalCount: 11,
        edges: [
          {
            cursor: btoa('11'),
            node: {
              __typename: 'RegisteredPlatform',
              id: uuidv4(),
              title: 'SaaS OpenCTI platform',
            },
          },
        ],
        pageInfo: {
          startCursor: btoa('11'),
          endCursor: btoa('11'),
          hasNextPage: false,
          hasPreviousPage: false,
        },
      } as unknown as RegisteredPlatformConnection;
      vi.spyOn(RegistrationDomain, 'loadSaasPlatforms').mockResolvedValue(
        connection
      );

      // When
      const result = await RegistrationApp.loadSaasPlatforms(args);

      // Then
      expect(RegistrationDomain.loadSaasPlatforms).toHaveBeenCalledWith(args);
      expect(result).toEqual(connection);
    });
  });
});
