import config from 'config';
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
import {
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  contextRegistererUserSecondOrga,
  contextSimpleUserSecondOrga,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextRegistererUserSecondOrga,
  requestContextSimpleUserSecondOrga,
  requestContextSystemUserManageDeployment,
  TEST_DEPLOYMENT,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  CompetitorTier,
  DeploymentRequestActivitySector,
  DeploymentRequestDeploymentType,
  DeploymentRequestFilterKey,
  DeploymentRequestHubStatus,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  ReorderDeploymentRequestInQueueDirection,
  ServiceDefinitionIdentifier,
  ServiceGroupName,
  ServiceInstanceCreationStatus,
  ServiceInstanceTag,
} from '../../__generated__/resolvers-types';
import DeploymentRequest, {
  DeploymentRequestId,
} from '../../model/kanel/public/DeploymentRequest';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import {
  SYSTEM_USER_UUID,
  XTM_HUB_DEV_TEAM_EMAIL,
  XTM_HUB_SUPPORT_EMAIL,
} from '../../portal.const';
import * as mailService from '../../server/mail-service';
import { auth0ClientMock } from '../../thirdparty/auth0/mock';
import { logApp } from '../../utils/app-logger.util';
import {
  AlreadyExistsErrorCode,
  BadRequestErrorCode,
  ErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import {
  TelemetryOrganizationType,
  TelemetrySource,
  TelemetryTargetProduct,
} from '../telemetry/telemetry.const';
import { TelemetryEventType } from '../telemetry/telemetry.types';
import { ServiceGroupDomain } from './group/service-group.domain';

import { MockInstance } from '@vitest/spy';
import { toGlobalId } from 'graphql-relay/node/node.js';
import { TestHelper } from '../../../tests/helper/test.helper';
import portalConfig from '../../config';
import { requestContext } from '../../context/request.context';
import { CompetitorId } from '../../model/kanel/public/Competitor';
import { PortalContext } from '../../model/portal-context';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import {
  DomainRegisteredPlatform,
  RegistrationDomain,
} from '../registration/registration.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { CompetitorDomain } from './competitor/competitor.domain';
import {
  BUNDLE_REQUEST_CANCELLATION_REASON,
  DeploymentCancellationApp,
} from './deployment-cancellation.app';
import {
  DeploymentApp,
  XTM_PLATFORM_BUNDLE_SERVICE_INSTANCE_NAME,
} from './deployment.app';
import { DeploymentRequestDomain } from './deployment.domain';
import {
  bundleQuotaKey,
  DeploymentQuotaDomain,
  trialQuotaKey,
} from './quota/deployment.quota.domain';

const QUOTA_REGION = DeploymentRequestPlatformRegion.UsEast;
const bundleQuotaFilter = {
  region: QUOTA_REGION,
  type: DeploymentRequestDeploymentType.Bundle,
};
const productQuotaFilter = (platform_identifier: PlatformIdentifier) => ({
  region: QUOTA_REGION,
  platform_identifier,
});

const loadAvailability = async (
  filter: Parameters<typeof TestHelper.deploymentRequestQuota.load>[0]
) => {
  const quota = await TestHelper.deploymentRequestQuota.load(filter);
  return quota!.availability;
};

const resetQuotaAvailabilities = async () => {
  for (const filter of [
    bundleQuotaFilter,
    productQuotaFilter(PlatformIdentifier.Opencti),
    productQuotaFilter(PlatformIdentifier.Openaev),
  ]) {
    await TestHelper.deploymentRequestQuota.update(filter, { availability: 5 });
  }
};

describe('deployment app', () => {
  let telemetrySpy: MockInstance;
  let mockSendMail: MockInstance;

  beforeEach(() => {
    telemetrySpy = vi
      .spyOn(TelemetryApp, 'sendTelemetryEvent')
      .mockResolvedValue();
    mockSendMail = vi.spyOn(mailService, 'sendMail');
  });

  afterEach(async () => {
    await TestHelper.deploymentRequest.deleteAllWithServiceInstanceAndSubscription();
  });

  afterAll(async () => {
    vi.useRealTimers();
  });

  describe('createDeploymentRequest', () => {
    it('should create a deployment request with associated registration', async () => {
      // Given
      requestContext.set(requestContextRegistererUserSecondOrga);

      vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
        isPlaceAvailable: true,
      });

      // When
      const deployment =
        await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Check data from DB
      const dbDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: deployment.id as DeploymentRequestId,
        });
      const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy(
        {
          id: dbDeploymentRequest!.service_instance_id,
        }
      );

      // Then
      expect(dbDeploymentRequest).toMatchObject({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        id: expect.any(String),
        job_title: DeploymentRequestJobTitle.CLevel,
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform_identifier: PlatformIdentifier.Opencti,
        platform_token: expect.any(String),
        region: DeploymentRequestPlatformRegion.UsEast,
        request_date: expect.any(Date),
        service_instance_id: expect.any(String),
        hub_status: DeploymentRequestHubStatus.Pending,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Unprovisioned,
        ordering: expect.any(Number),
        type: DeploymentRequestDeploymentType.Trial,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        source: DeploymentRequestSource.Xtmhub,
      });
      expect(serviceInstance?.creation_status).toBe(
        ServiceInstanceCreationStatus.Pending
      );
    });
    it('should create a deployment request with queued status when there is no space available', async () => {
      // Given
      requestContext.set(requestContextRegistererUserSecondOrga);

      vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
        isPlaceAvailable: false,
      });

      // When
      const deployment =
        await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Check data from DB
      const dbDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: deployment.id as DeploymentRequestId,
        });

      const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy(
        {
          id: dbDeploymentRequest!.service_instance_id,
        }
      );

      // Then
      expect(dbDeploymentRequest).toMatchObject({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        id: expect.any(String),
        job_title: DeploymentRequestJobTitle.CLevel,
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platform_identifier: PlatformIdentifier.Opencti,
        platform_token: expect.any(String),
        region: DeploymentRequestPlatformRegion.UsEast,
        request_date: expect.any(Date),
        service_instance_id: expect.any(String),
        hub_status: DeploymentRequestHubStatus.Queued,
        target_state: DeploymentRequestPlatformState.Unprovisioned,
        actual_state: DeploymentRequestPlatformState.Unprovisioned,
        ordering: expect.any(Number),
        type: DeploymentRequestDeploymentType.Trial,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        source: DeploymentRequestSource.Xtmhub,
      });
      expect(serviceInstance?.creation_status).toBe(
        ServiceInstanceCreationStatus.Pending
      );
    });
    it('should throw when deployment is requested on a personal space', async () => {
      // Given
      vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
        isPlaceAvailable: true,
      });
      const personalSpaceOrganization = await TestHelper.organization.load({
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.EMAIL,
      });

      requestContext.set({
        ...requestContextSimpleUserSecondOrga,
        user: {
          ...requestContextSimpleUserSecondOrga.user,
          selected_organization_id: personalSpaceOrganization!.id,
        },
      });

      // When
      const call = DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Then
      await expect(call).rejects.toThrow(
        ErrorCode.CantRequestFreeTrialInPersonalSpace
      );
    });
    it('should throw when service definition is not found', async () => {
      const call = DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        products: ['unknown-platform' as PlatformIdentifier],
        use_cases_by_product: [
          {
            platform_identifier: 'unknown-platform' as PlatformIdentifier,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
        ],
      });

      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });
    it('should throw when a requested product has no use case', async () => {
      // When
      const call = DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        use_cases_by_product: [],
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidUseCasesForProducts
      );
    });

    it('should throw when a use case targets a product that was not requested', async () => {
      // When
      const call = DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        type: DeploymentRequestDeploymentType.Bundle,
        products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        use_cases_by_product: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
          {
            platform_identifier: PlatformIdentifier.Openaev,
            use_case: DeploymentRequestUseCase.OaevPurpleTeam,
          },
        ],
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidUseCasesForProducts
      );
    });
    it('should throw when two use cases target the same product', async () => {
      // When
      const call = DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        type: DeploymentRequestDeploymentType.Bundle,
        products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        use_cases_by_product: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.DetectionEngineering,
          },
        ],
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidUseCasesForProducts
      );
    });
    it.each([
      [[PlatformIdentifier.Xtmone]],
      [[PlatformIdentifier.Opencti, PlatformIdentifier.Openaev]],
      [[]],
    ])(
      'should throw InvalidProductsForDeploymentType for a trial with products %s',
      async (products) => {
        const call = DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          products,
        });

        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidProductsForDeploymentType
        );
      }
    );

    it.each([
      [[PlatformIdentifier.Opencti, PlatformIdentifier.Openaev]],
      [[PlatformIdentifier.Xtmone]],
      [[PlatformIdentifier.Xtmone, PlatformIdentifier.Xtmone]],
    ])(
      'should throw InvalidProductsForDeploymentType for a bundle with products %s',
      async (products) => {
        const call = DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products,
        });

        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidProductsForDeploymentType
        );
      }
    );

    it("should throw when a bundle product's service definition is not found", async () => {
      const call = DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        type: DeploymentRequestDeploymentType.Bundle,
        products: [
          PlatformIdentifier.Xtmone,
          'unknown-platform' as PlatformIdentifier,
        ],
        use_cases_by_product: [
          {
            platform_identifier: 'unknown-platform' as PlatformIdentifier,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
        ],
      });

      await expect(call).rejects.toThrow(ErrorCode.ServiceDefinitionNotFound);
    });

    describe('bundle creation', () => {
      beforeEach(() => {
        requestContext.set(requestContextRegistererUserSecondOrga);
        vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
          isPlaceAvailable: true,
        });
        vi.spyOn(DeploymentQuotaDomain, 'freePlace').mockResolvedValue();
      });

      it('should create a bundle deployment request with a child trial deployment request per product', async () => {
        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [
            PlatformIdentifier.Xtmone,
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.OaevPurpleTeam,
            },
          ],
        });

        expect(bundle).toMatchObject({
          type: DeploymentRequestDeploymentType.Bundle,
          platform_identifier: null,
          parent_id: null,
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
        });

        const bundleServiceInstance = await TestHelper.serviceInstance.load({
          id: bundle.service_instance_id,
        });
        expect(bundleServiceInstance).toMatchObject({
          public: false,
          creation_status: ServiceInstanceCreationStatus.Pending,
        });
        expect(bundleServiceInstance?.tags).toEqual(
          expect.arrayContaining([
            ServiceInstanceTag.Trial,
            ServiceInstanceTag.XtmOne,
            ServiceInstanceTag.OpenCti,
            ServiceInstanceTag.OpenAev,
          ])
        );

        const bundleServiceDefinition = await TestHelper.serviceDefinition.load(
          { id: bundleServiceInstance?.service_definition_id }
        );
        expect(bundleServiceDefinition?.identifier).toBe(
          ServiceDefinitionIdentifier.XtmPlatformBundle
        );

        const bundleSubscription = await TestHelper.subscription.load({
          service_instance_id: bundle.service_instance_id,
        });
        expect(bundleSubscription).toMatchObject({
          organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          end_date: null,
        });

        const children = await TestHelper.deploymentRequest.loadMany({
          parent_id: bundle.id as DeploymentRequestId,
        });
        expect(children).toHaveLength(3);
        expect(children).toEqual(
          expect.arrayContaining(
            [
              PlatformIdentifier.Xtmone,
              PlatformIdentifier.Opencti,
              PlatformIdentifier.Openaev,
            ].map((platformIdentifier) =>
              expect.objectContaining({
                type: DeploymentRequestDeploymentType.Trial,
                platform_identifier: platformIdentifier,
                parent_id: bundle.id,
              })
            )
          )
        );

        expect(telemetrySpy).toHaveBeenCalledTimes(4);
        const bundleEventCall = telemetrySpy.mock.calls.find(
          ([event]) => event.deployment_id === bundle.id
        );
        expect(bundleEventCall?.[0]).toMatchObject({
          event_type: TelemetryEventType.CREATE_DEPLOYMENT,
          deployment_id: bundle.id,
          deployment_type: DeploymentRequestDeploymentType.Bundle,
          target_product: undefined,
        });
        expect(bundleEventCall?.[0]).not.toHaveProperty('parent_id');
        [
          TelemetryTargetProduct.XTM_ONE,
          TelemetryTargetProduct.OPEN_CTI,
          TelemetryTargetProduct.OPEN_AEV,
        ].forEach((target_product) => {
          expect(telemetrySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: TelemetryEventType.CREATE_DEPLOYMENT,
              deployment_type: DeploymentRequestDeploymentType.Trial,
              parent_id: bundle.id,
              target_product,
            })
          );
        });
        expect(mockSendMail).toHaveBeenCalledTimes(4);
        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
          template: 'free_trial_bundle_requested',
          params: {
            firstName: 'Anita',
            productNames: 'OpenAEV, OpenCTI, and XTM One',
            products: [
              PlatformIdentifier.Openaev,
              PlatformIdentifier.Opencti,
              PlatformIdentifier.Xtmone,
            ],
          },
        });
      });

      it('should bypass the free trial limit check for bundle products', async () => {
        // Given
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            organization_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
            platform_identifier: PlatformIdentifier.Opencti,
            hub_status: DeploymentRequestHubStatus.Active,
            counts_in_orga_quota: true,
          }
        );

        // When
        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        // Then
        expect(bundle.id).toBeDefined();
        const children = await TestHelper.deploymentRequest.loadMany({
          parent_id: bundle.id as DeploymentRequestId,
        });
        expect(children).toHaveLength(2);
      });

      it('should allow a bundle when another organization has an on-going trial', async () => {
        requestContext.set(requestContextAdminUser);
        const otherOrgaTrial = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          products: [PlatformIdentifier.Opencti],
        });

        requestContext.set(requestContextRegistererUserSecondOrga);
        await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        });

        await TestHelper.deploymentRequest.assertProperties(
          otherOrgaTrial.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Pending }
        );
      });

      it.each([
        [DeploymentRequestHubStatus.Cancelled],
        [DeploymentRequestHubStatus.Expired],
      ])(
        'should allow a bundle when a product trial is %s, even when it still counts in the orga quota',
        async (hub_status) => {
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              organization_requester_id:
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status,
              counts_in_orga_quota: true,
            }
          );

          const bundle = await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });

          expect(bundle.id).toBeDefined();
          const children = await TestHelper.deploymentRequest.loadMany({
            parent_id: bundle.id as DeploymentRequestId,
          });
          expect(children).toHaveLength(2);
        }
      );

      it('should reject a second bundle for the same organization', async () => {
        await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        });

        const call = DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Openaev],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        await expect(call).rejects.toThrow(
          AlreadyExistsErrorCode.FreeTrialAlreadyExists
        );
      });

      it('should reject the second of two concurrent bundles for the same organization in different regions', async () => {
        const results = await Promise.allSettled([
          DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            region: DeploymentRequestPlatformRegion.EuWest,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          }),
          DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            region: DeploymentRequestPlatformRegion.UsEast,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Openaev],
          }),
        ]);

        expect(
          results.filter((result) => result.status === 'fulfilled')
        ).toHaveLength(1);
        expect(
          results.filter((result) => result.status === 'rejected')
        ).toHaveLength(1);

        const bundles = await TestHelper.deploymentRequest.loadMany({
          organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION
            .ID as OrganizationId,
          type: DeploymentRequestDeploymentType.Bundle,
        });
        expect(bundles).toHaveLength(1);
      });

      it('should roll back the whole bundle when a child fails to be created', async () => {
        const originalRegisterNewPlatform =
          RegistrationDomain.registerNewPlatform;
        let callCount = 0;
        const registerNewPlatformSpy = vi
          .spyOn(RegistrationDomain, 'registerNewPlatform')
          .mockImplementation(async (args) => {
            callCount += 1;
            if (callCount === 2) {
              throw new Error('boom');
            }
            return originalRegisterNewPlatform(args);
          });

        const call = DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [
            PlatformIdentifier.Xtmone,
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.OaevPurpleTeam,
            },
          ],
        });

        await expect(call).rejects.toThrow('boom');
        expect(registerNewPlatformSpy).toHaveBeenCalledTimes(2);

        const deploymentRequests = await TestHelper.deploymentRequest.loadMany(
          {}
        );
        expect(deploymentRequests).toHaveLength(0);

        const serviceInstances = await TestHelper.serviceInstance.load({
          name: XTM_PLATFORM_BUNDLE_SERVICE_INSTANCE_NAME,
        });
        expect(serviceInstances).toBeUndefined();
      });

      describe('standalone trials cancellation', () => {
        it('should cancel ongoing standalone trials of the organization when the bundle is requested', async () => {
          // Given an ongoing standalone trial of the requesting organization
          const standalone =
            await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
              {
                organization_requester_id:
                  TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                hub_status: DeploymentRequestHubStatus.Active,
              }
            );

          // When the bundle is requested
          await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });

          // Then the standalone trial is cancelled
          await TestHelper.deploymentRequest.assertProperties(standalone.id, {
            hub_status: DeploymentRequestHubStatus.Cancelled,
            cancellation_reason: BUNDLE_REQUEST_CANCELLATION_REASON,
          });
        });

        it('should delete the Auth0 audience of cancelled standalone trials', async () => {
          // Given an ongoing standalone trial of the requesting organization
          const deleteAudienceSpy = vi.spyOn(
            auth0ClientMock,
            'deleteAudienceAPI'
          );

          const standalone =
            await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
              {
                organization_requester_id:
                  TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
                hub_status: DeploymentRequestHubStatus.Active,
                platform_id: uuidv4(),
              }
            );

          // When the bundle is requested
          await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });

          // Then the Auth0 audience of the cancelled standalone trial is deleted
          expect(deleteAudienceSpy).toHaveBeenCalledWith(
            standalone.organization_requester_id,
            standalone.platform_id
          );
        });

        it('should not cancel standalone trials of another organization', async () => {
          // Given an ongoing standalone trial owned by another organization
          const standalone =
            await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
              {
                organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
                hub_status: DeploymentRequestHubStatus.Active,
              }
            );

          // When a bundle is requested by another organization
          await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });

          const untouched =
            await DeploymentRequestDomain.loadDeploymentRequestBy({
              id: standalone.id,
            });

          // Then the other organization's standalone trial is untouched
          expect(untouched).toMatchObject({
            hub_status: DeploymentRequestHubStatus.Active,
          });
        });

        it('should not cancel the children of the bundle itself', async () => {
          // When the bundle is requested with its child trials
          const bundle = await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });

          const children = await TestHelper.deploymentRequest.loadMany({
            parent_id: bundle.id as DeploymentRequestId,
          });

          // Then the bundle's own children are untouched
          expect(children).not.toHaveLength(0);
          children.forEach((child) => {
            expect(child.hub_status).not.toBe(
              DeploymentRequestHubStatus.Cancelled
            );
          });
        });
      });
    });
  });
  describe('domains blacklist', () => {
    afterEach(async () => {
      await TestHelper.competitor.delete({});
    });

    it('should throw error when organization domain is blacklisted', async () => {
      // Given
      await TestHelper.competitor.create();

      const call = DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Then
      await expect(call).rejects.toThrow(ErrorCode.CantRequestFreeTrial);
    });

    it('should allow deployment when organization domain is not blacklisted', async () => {
      // Given
      requestContext.set(requestContextRegistererUserSecondOrga);

      await TestHelper.competitor.create({
        name: 'NotBlocked',
        domain: 'not-blocked.com',
      });

      const deployment =
        await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Then
      expect(deployment.id).toBeDefined();
    });

    it('should allow deployment when no competitors exist', async () => {
      requestContext.set(requestContextRegistererUserSecondOrga);

      const deployment =
        await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

      // Then
      expect(deployment.id).toBeDefined();
    });

    describe('telemetry', () => {
      it.each`
        product                       | targetProduct | source                                 | telemetrySource
        ${PlatformIdentifier.Opencti} | ${'open-cti'} | ${DeploymentRequestSource.OpenctiDemo} | ${TelemetrySource.DEMO_OPENCTI}
        ${PlatformIdentifier.Openaev} | ${'open-aev'} | ${DeploymentRequestSource.OpenaevDemo} | ${TelemetrySource.DEMO_OPENAEV}
        ${PlatformIdentifier.Opencti} | ${'open-cti'} | ${DeploymentRequestSource.Xtmhub}      | ${TelemetrySource.XTMHUB}
        ${PlatformIdentifier.Openaev} | ${'open-aev'} | ${DeploymentRequestSource.Xtmhub}      | ${TelemetrySource.XTMHUB}
      `(
        'should send a telemetry event when trial for $product platform is launched',
        async ({ product, targetProduct, source, telemetrySource }) => {
          // Given
          requestContext.set(requestContextRegistererUserSecondOrga);

          vi.useFakeTimers();
          const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
          vi.setSystemTime(date);

          // When
          const deployment = await DeploymentApp.createDeploymentRequest({
            activity_sector:
              DeploymentRequestActivitySector.ComputerNetworkSecurity,
            job_title: DeploymentRequestJobTitle.CLevel,
            use_cases_by_product: [
              {
                platform_identifier: product,
                use_case: DeploymentRequestUseCase.ThreatHunting,
              },
            ],
            products: [product],
            region: DeploymentRequestPlatformRegion.UsEast,
            type: DeploymentRequestDeploymentType.Trial,
            source,
          });

          // Then
          expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
            '@timestamp': '2025-02-03T13:12:15.000Z',
            event_type: TelemetryEventType.CREATE_DEPLOYMENT,
            organization_id:
              contextRegistererUserSecondOrga.user.organizations[0]!.id,
            organization_name:
              contextRegistererUserSecondOrga.user.organizations[0]!.name,
            organization_type: TelemetryOrganizationType.PROFESSIONAL,
            source: telemetrySource,
            email: contextRegistererUserSecondOrga.user.email,
            job_title: DeploymentRequestJobTitle.CLevel,
            user_id: contextRegistererUserSecondOrga.user.id,
            deployment_id: deployment.id,
            region: DeploymentRequestPlatformRegion.UsEast,
            use_case: DeploymentRequestUseCase.ThreatHunting,
            deployment_type: DeploymentRequestDeploymentType.Trial,
            status: DeploymentRequestHubStatus.Pending,
            activity_sector:
              DeploymentRequestActivitySector.ComputerNetworkSecurity,
            target_product: targetProduct,
            parent_id: undefined,
          });
        }
      );
      it('should not throw when an error is thrown by telemetry', async () => {
        requestContext.set(requestContextRegistererUserSecondOrga);

        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);
        telemetrySpy.mockRejectedValue(new Error('UNKNOWN'));

        const deployment =
          await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

        expect(deployment).toBeDefined();
      });
    });

    describe('mail', () => {
      describe('development environment', () => {
        it('should send a mail if status is pending to dev team', async () => {
          requestContext.set(requestContextAdminUser);

          await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

          expect(mockSendMail).toHaveBeenCalledTimes(2);

          expect(mockSendMail).toHaveBeenNthCalledWith(1, {
            to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            template: 'free_trial_requested',
            params: {
              firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
              platformIdentifier: PlatformIdentifier.Opencti,
            },
          });

          expect(mockSendMail).toHaveBeenNthCalledWith(2, {
            to: XTM_HUB_DEV_TEAM_EMAIL,
            template: 'admin_saas_instance_requested',
            params: {
              activitySector:
                DeploymentRequestActivitySector.ComputerNetworkSecurity,
              deploymentType: 'Trial',
              organizationName: TEST_ORGANIZATIONS.FILIGRAN.NAME,
              platformIdentifier: PlatformIdentifier.Opencti,
              region: DeploymentRequestPlatformRegion.UsEast,
              useCase: DeploymentRequestUseCase.ThreatHunting,
              userEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
              userName: `${TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME} ${TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME}`,
            },
          });
        });

        it('should send a mail if there is no space available', async () => {
          requestContext.set(requestContextRegistererUserSecondOrga);

          vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
            isPlaceAvailable: false,
          });

          await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

          expect(mockSendMail).toHaveBeenCalledTimes(2);

          expect(mockSendMail).toHaveBeenNthCalledWith(1, {
            to: contextRegistererUserSecondOrga.user.email,
            template: 'free_trial_queued',
            params: {
              firstName: contextRegistererUserSecondOrga.user.first_name,
              platformIdentifier: PlatformIdentifier.Opencti,
            },
          });

          expect(mockSendMail).toHaveBeenNthCalledWith(2, {
            to: XTM_HUB_DEV_TEAM_EMAIL,
            template: 'admin_saas_instance_requested',
            params: {
              activitySector:
                DeploymentRequestActivitySector.ComputerNetworkSecurity,
              deploymentType: 'Trial',
              organizationName:
                contextRegistererUserSecondOrga.user.organizations[0]!.name,
              platformIdentifier: PlatformIdentifier.Opencti,
              region: 'us_east',
              useCase: DeploymentRequestUseCase.ThreatHunting,
              userEmail: contextRegistererUserSecondOrga.user.email,
              userName: `${contextRegistererUserSecondOrga.user.first_name} ${contextRegistererUserSecondOrga.user.last_name}`,
            },
          });
        });
      });

      describe('production environment', () => {
        let originalEnvironment: typeof portalConfig.environment;

        beforeEach(async () => {
          originalEnvironment = portalConfig.environment;
          portalConfig.environment = 'production';
        });

        afterEach(async () => {
          portalConfig.environment = originalEnvironment;
        });

        it('should send a mail if status is pending to dev team', async () => {
          requestContext.set(requestContextAdminUser);

          await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

          expect(mockSendMail).toHaveBeenCalledTimes(2);

          expect(mockSendMail).toHaveBeenNthCalledWith(1, {
            to: contextBypassUser.user.email,
            template: 'free_trial_requested',
            params: {
              firstName: contextBypassUser.user.first_name,
              platformIdentifier: PlatformIdentifier.Opencti,
            },
          });

          expect(mockSendMail).toHaveBeenNthCalledWith(2, {
            to: XTM_HUB_SUPPORT_EMAIL,
            template: 'admin_saas_instance_requested',
            params: {
              activitySector:
                DeploymentRequestActivitySector.ComputerNetworkSecurity,
              deploymentType: 'Trial',
              organizationName: contextBypassUser.user.organizations[0]!.name,
              platformIdentifier: PlatformIdentifier.Opencti,
              region: DeploymentRequestPlatformRegion.UsEast,
              useCase: DeploymentRequestUseCase.ThreatHunting,
              userEmail: contextBypassUser.user.email,
              userName: `${contextBypassUser.user.first_name} ${contextBypassUser.user.last_name}`,
            },
          });
        });

        it('should send a mail if there is no space available', async () => {
          requestContext.set(requestContextRegistererUserSecondOrga);

          vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
            isPlaceAvailable: false,
          });

          await DeploymentApp.createDeploymentRequest(TEST_DEPLOYMENT);

          expect(mockSendMail).toHaveBeenCalledTimes(2);

          expect(mockSendMail).toHaveBeenNthCalledWith(1, {
            to: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
            template: 'free_trial_queued',
            params: {
              firstName:
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER
                  .FIRST_NAME,
              platformIdentifier: PlatformIdentifier.Opencti,
            },
          });

          expect(mockSendMail).toHaveBeenNthCalledWith(2, {
            to: XTM_HUB_SUPPORT_EMAIL,
            template: 'admin_saas_instance_requested',
            params: {
              activitySector:
                DeploymentRequestActivitySector.ComputerNetworkSecurity,
              deploymentType: 'Trial',
              organizationName: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
              platformIdentifier: PlatformIdentifier.Opencti,
              region: 'us_east',
              useCase: DeploymentRequestUseCase.ThreatHunting,
              userEmail:
                TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
              userName: `${TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.FIRST_NAME} ${TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.LAST_NAME}`,
            },
          });
        });
      });
    });

    describe('quota', () => {
      beforeEach(async () => {
        requestContext.set(requestContextRegistererUserSecondOrga);
        await resetQuotaAvailabilities();
      });

      it('should reserve the product place and borrow a bundle place for a standalone trial', async () => {
        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        expect(request.hub_status).toBe(DeploymentRequestHubStatus.Pending);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(4);
        expect(await loadAvailability(bundleQuotaFilter)).toBe(4);
      });

      it('should queue the trial when the product quota is full, without borrowing a bundle place', async () => {
        await TestHelper.deploymentRequestQuota.update(
          productQuotaFilter(PlatformIdentifier.Opencti),
          { availability: 0 }
        );

        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        expect(request.hub_status).toBe(DeploymentRequestHubStatus.Queued);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(0);
        expect(await loadAvailability(bundleQuotaFilter)).toBe(5);
      });

      it('should not block a standalone trial on an exhausted bundle quota, which may go negative', async () => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          availability: 0,
        });

        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        expect(request.hub_status).toBe(DeploymentRequestHubStatus.Pending);
        expect(await loadAvailability(bundleQuotaFilter)).toBe(-1);
      });

      it('should reserve the bundle place and one place per embarked product', async () => {
        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [
            PlatformIdentifier.Xtmone,
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        expect(bundle.hub_status).toBe(DeploymentRequestHubStatus.Pending);
        expect(await loadAvailability(bundleQuotaFilter)).toBe(4);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(4);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Openaev))
        ).toBe(4);
      });

      it('should create a bundle even when every product quota is full', async () => {
        for (const platformIdentifier of [
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ]) {
          await TestHelper.deploymentRequestQuota.update(
            productQuotaFilter(platformIdentifier),
            { availability: 0 }
          );
        }

        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [
            PlatformIdentifier.Xtmone,
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        expect(bundle.hub_status).toBe(DeploymentRequestHubStatus.Pending);
      });

      it('should queue the bundle and all its children together when the bundle quota is full', async () => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          availability: 0,
        });

        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [
            PlatformIdentifier.Xtmone,
            PlatformIdentifier.Opencti,
            PlatformIdentifier.Openaev,
          ],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        expect(bundle.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        const children = await TestHelper.deploymentRequest.loadMany({
          parent_id: bundle.id as DeploymentRequestId,
        });
        expect(children).toHaveLength(3);
        for (const child of children) {
          expect(child.hub_status).toBe(DeploymentRequestHubStatus.Queued);
        }
        expect(await loadAvailability(bundleQuotaFilter)).toBe(0);
      });

      it('should count a bundle child as an existing trial for that product', async () => {
        await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        });

        const call = DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        await expect(call).rejects.toThrow(
          AlreadyExistsErrorCode.FreeTrialAlreadyExists
        );
      });

      it('should not count a bundle child for a product the bundle does not include', async () => {
        await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Openaev],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });

        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        expect(request.id).toBeDefined();
      });
    });
  });
  describe('loadDeploymentRequests', () => {
    beforeEach(() => {
      requestContext.set(requestContextSystemUserManageDeployment);
    });

    it('should return created deployment requests', async () => {
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
      });

      expect(deployments.totalCount).toBe('1');
      expect(deployments.edges[0]?.node).toStrictEqual({
        ...deploymentRequest,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_domains: [
          TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST,
          TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.SECOND,
        ],
        requester_email: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        requester_first_name:
          TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
        requester_last_name: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.LAST_NAME,
        cancellation_user_email: null,
        platform_url: null,
      });
    });

    it('should return platform_url when PlatformConfiguration exists', async () => {
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );

      await TestHelper.platformConfiguration.create({
        service_instance_id: deploymentRequest!.service_instance_id,
        platform_url: 'https://test-platform.opencti.io',
        status: PlatformConfigurationStatus.Active,
      });

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
      });

      const deployment = deployments.edges.find(
        (edge) => edge.node.id === deploymentRequest!.id
      );

      expect(deployment?.node.platform_url).toBe(
        'https://test-platform.opencti.io'
      );

      await TestHelper.platformConfiguration.delete({
        service_instance_id: deploymentRequest!.service_instance_id,
      });
    });

    it('should return out-of-sync deployment requests by default', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Pending,
          target_state: DeploymentRequestPlatformState.Active,
          actual_state: undefined,
        }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Active,
          target_state: DeploymentRequestPlatformState.Active,
          actual_state: DeploymentRequestPlatformState.Active,
        }
      );

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
      });

      expect(deployments.totalCount).toBe('1');
      expect(deployments.edges).toHaveLength(1);
      expect(deployments.edges[0]?.node?.hub_status).toBe(
        DeploymentRequestHubStatus.Pending
      );
    });

    it('should return out-of-sync deployments even with other filters', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          target_state: DeploymentRequestPlatformState.Active,
          actual_state: undefined,
        }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Active,
          target_state: DeploymentRequestPlatformState.Active,
          actual_state: DeploymentRequestPlatformState.Active,
        }
      );

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
        filters: [
          {
            key: DeploymentRequestFilterKey.Region,
            value: [DeploymentRequestPlatformRegion.UsEast],
          },
        ],
      });

      expect(deployments.totalCount).toBe('1');
      expect(deployments.edges).toHaveLength(1);
      expect(deployments.edges[0]?.node?.hub_status).toBe(
        DeploymentRequestHubStatus.Pending
      );
    });

    it('should filter multiple out-of-sync scenarios correctly', async () => {
      // Out-of-sync: NULL target vs NULL actual (both NULL = synced, should NOT appear)
      const synced1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Queued,
            target_state: undefined,
            actual_state: undefined,
          }
        );

      // Out-of-sync: active target vs NULL actual
      const outOfSync1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: undefined,
          }
        );

      // Out-of-sync: active target vs provisioning actual
      const outOfSync2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Provisioning,
          }
        );

      // Synced: active target vs active actual
      const synced2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Active,
          }
        );

      // Out-of-sync: NULL target vs provisioning actual
      const outOfSync3 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Failed,
            target_state: undefined,
            actual_state: DeploymentRequestPlatformState.Provisioning,
          }
        );

      // Synced: inactive target vs inactive actual
      const synced3 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            target_state: DeploymentRequestPlatformState.Unprovisioned,
            actual_state: DeploymentRequestPlatformState.Unprovisioned,
          }
        );

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
      });

      expect(deployments.totalCount).toBe('3');
      expect(deployments.edges).toHaveLength(3);

      const returnedIds = deployments.edges.map((edge) => edge.node.id);
      expect(returnedIds).toContain(outOfSync1!.id);
      expect(returnedIds).toContain(outOfSync2!.id);
      expect(returnedIds).toContain(outOfSync3!.id);
      expect(returnedIds).not.toContain(synced1!.id);
      expect(returnedIds).not.toContain(synced2!.id);
      expect(returnedIds).not.toContain(synced3!.id);
    });

    it('should return filtered deployment requests only', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          region: DeploymentRequestPlatformRegion.EuWest,
          hub_status: DeploymentRequestHubStatus.Active,
          actual_state: DeploymentRequestPlatformState.Active,
        }
      );
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_identifier: PlatformIdentifier.Openaev,
          hub_status: DeploymentRequestHubStatus.Active,
          actual_state: DeploymentRequestPlatformState.Active,
        }
      );

      const deployments = await DeploymentApp.loadPlatformDeploymentRequests({
        first: 10,
        filters: [
          {
            key: DeploymentRequestFilterKey.Region,
            value: [DeploymentRequestPlatformRegion.UsEast],
          },
          {
            key: DeploymentRequestFilterKey.HubStatus,
            value: [DeploymentRequestHubStatus.Active],
          },
          {
            key: DeploymentRequestFilterKey.PlatformIdentifier,
            value: [PlatformIdentifier.Opencti],
          },
        ],
      });

      expect(deployments.totalCount).toBe('0');
      expect(deployments.edges).toHaveLength(0);
    });
  });
  describe('updateDeploymentRequest', () => {
    let initialDeployment: DeploymentRequest;
    beforeEach(async () => {
      requestContext.set(requestContextSystemUserManageDeployment);

      initialDeployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Pending,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Provisioning,
          }
        )) as DeploymentRequest;
    });

    it('should update a deployment request', async () => {
      const deployment = await DeploymentApp.updateDeploymentRequest({
        id: initialDeployment?.id as DeploymentRequestId,
        actual_state: DeploymentRequestPlatformState.Active,
        start_date: new Date(2025, 1, 3),
        end_date: new Date(2025, 2, 3),
        platform_id: 'fake product instance id',
        failure_reason: 'not failed',
      });

      const dbDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: deployment.id as DeploymentRequestId,
        });

      if (!dbDeploymentRequest) return;

      const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy(
        {
          id: dbDeploymentRequest!.service_instance_id,
        }
      );
      const subscription = await SubscriptionDomain.loadSubscriptionBy({
        service_instance_id: dbDeploymentRequest.service_instance_id,
      });

      expect(dbDeploymentRequest).toMatchObject({
        activity_sector:
          DeploymentRequestActivitySector.ComputerNetworkSecurity,
        id: expect.any(String),
        job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
        organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platform_identifier: PlatformIdentifier.Opencti,
        platform_token: expect.any(String),
        region: DeploymentRequestPlatformRegion.UsEast,
        request_date: expect.any(Date),
        service_instance_id: expect.any(String),
        hub_status: DeploymentRequestHubStatus.Active,
        target_state: DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Active,
        ordering: expect.any(Number),
        type: DeploymentRequestDeploymentType.Trial,
        use_case: DeploymentRequestUseCase.ThreatHunting,
        user_requester_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        start_date: new Date(2025, 1, 3),
        end_date: new Date(2025, 2, 3),
        platform_id: 'fake product instance id',
        failure_reason: 'not failed',
        source: DeploymentRequestSource.Xtmhub,
      });
      expect(serviceInstance?.creation_status).toBe(
        ServiceInstanceCreationStatus.Pending
      );
      expect(subscription).toBeDefined();
      if (subscription) {
        expect(subscription.start_date).toStrictEqual(
          dbDeploymentRequest.start_date
        );
        expect(subscription.end_date).toStrictEqual(
          dbDeploymentRequest.end_date
        );
      }
    });

    it.each([
      {
        platformIdentifier: PlatformIdentifier.Opencti,
        expectedGroups: [
          ServiceGroupName.Admin,
          ServiceGroupName.Analyst,
          ServiceGroupName.Reader,
        ],
      },
      {
        platformIdentifier: PlatformIdentifier.Openaev,
        expectedGroups: [
          ServiceGroupName.Admin,
          ServiceGroupName.Manager,
          ServiceGroupName.Observer,
        ],
      },
      {
        platformIdentifier: PlatformIdentifier.Xtmone,
        expectedGroups: [ServiceGroupName.Admin, ServiceGroupName.User],
      },
    ])(
      'with Active status for $platformIdentifier, it should create the expected ServiceGroups with admin user',
      async ({ platformIdentifier, expectedGroups }) => {
        const platformDeployment =
          (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              platform_identifier: platformIdentifier,
              hub_status: DeploymentRequestHubStatus.Pending,
              target_state: DeploymentRequestPlatformState.Active,
              actual_state: DeploymentRequestPlatformState.Provisioning,
            }
          )) as DeploymentRequest;

        const deployment = await DeploymentApp.updateDeploymentRequest({
          id: platformDeployment.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date: new Date(2025, 1, 3),
          end_date: new Date(2025, 2, 3),
          platform_id: 'fake platform instance id',
          failure_reason: 'not failed',
        });
        const dbDeploymentRequest =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: deployment.id as DeploymentRequestId,
          });
        const serviceGroups = await ServiceGroupDomain.loadServiceGroups({
          service_instance_id: dbDeploymentRequest!.service_instance_id,
        });
        expect(serviceGroups).toHaveLength(expectedGroups.length);
        expect(serviceGroups.map((g) => g.name).sort()).toEqual(
          [...expectedGroups].sort()
        );

        const userAdminGroup =
          await ServiceGroupDomain.loadGroupUsersByServiceAndName(
            dbDeploymentRequest!.service_instance_id,
            ServiceGroupName.Admin
          );
        expect(userAdminGroup).toHaveLength(1);
        expect(
          userAdminGroup.find(
            ({ email }) =>
              email === TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL
          )
        ).toBeTruthy();

        const nonAdminGroups = expectedGroups.filter(
          (name) => name !== ServiceGroupName.Admin
        );
        for (const groupName of nonAdminGroups) {
          const users = await ServiceGroupDomain.loadGroupUsersByServiceAndName(
            dbDeploymentRequest!.service_instance_id,
            groupName
          );
          expect(users).toHaveLength(0);
        }
      }
    );

    it('should set platform registration status to inactive when actual state is removed', async () => {
      await TestHelper.platformConfiguration.create({
        service_instance_id: initialDeployment.service_instance_id,
        status: PlatformConfigurationStatus.Active,
      });

      try {
        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Removed,
        });

        const platformConfiguration =
          await TestHelper.platformConfiguration.load({
            service_instance_id: initialDeployment.service_instance_id,
          });

        expect(platformConfiguration?.status).toBe(
          PlatformConfigurationStatus.Inactive
        );
      } finally {
        await TestHelper.platformConfiguration.delete({
          service_instance_id: initialDeployment.service_instance_id,
        });
      }
    });

    it('should throw if deployment request does not exist', async () => {
      const call = DeploymentApp.updateDeploymentRequest({
        id: uuidv4() as DeploymentRequestId,
        actual_state: DeploymentRequestPlatformState.Active,
      });

      await expect(call).rejects.toThrow(
        NotFoundErrorCode.DeploymentRequestNotFound
      );
    });
    it.each([
      {
        start_date: undefined,
        end_date: undefined,
        description: 'both dates missing',
      },
      {
        start_date: undefined,
        end_date: new Date(),
        description: 'start date missing',
      },
      {
        start_date: new Date(),
        end_date: undefined,
        description: 'end date missing',
      },
    ])(
      'should throw if status active and $description',
      async ({ start_date, end_date }) => {
        const call = DeploymentApp.updateDeploymentRequest({
          id: initialDeployment.id,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date,
          end_date,
        });

        await expect(call).rejects.toThrow(
          BadRequestErrorCode.MissingStartOrEndDate
        );
      }
    );
    describe('telemetry', () => {
      it('should send a telemetry event', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        const start_date = new Date(2025, 1, 3);
        const end_date = new Date(2025, 2, 3);

        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date,
          end_date,
          platform_id: 'fake product instance id',
          failure_reason: 'not failed',
        });

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          deployment_id: initialDeployment.id,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: 'fake product instance id',
          start_date,
          end_date,
          status: DeploymentRequestHubStatus.Active,
          parent_id: undefined,
        });
      });

      it('should not send a telemetry event when data did not change', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        telemetrySpy.mockClear();

        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        expect(telemetrySpy).not.toHaveBeenCalled();
      });

      it('should not throw when telemetry throws an error', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        telemetrySpy.mockRejectedValue(new Error('UNKNOWN'));
        vi.setSystemTime(date);

        const start_date = new Date(2025, 1, 3);
        const end_date = new Date(2025, 2, 3);

        const deployment = await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date,
          end_date,
          platform_id: 'fake product instance id',
          failure_reason: 'not failed',
        });

        expect(deployment).toBeDefined();
      });
    });
    describe('mail', () => {
      it('should send a mail in case deployment request is in provisioning (only first time)', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          template: 'free_trial_provisioning',
          params: {
            firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            platformIdentifier: PlatformIdentifier.Opencti,
          },
        });

        mockSendMail.mockClear();

        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        expect(mockSendMail).not.toHaveBeenCalled();
      });

      it('should send a mail in case deployment request is in active (only first time)', async () => {
        vi.spyOn(
          PlatformConfigurationDomain,
          'loadConfigurationByPlatform'
        ).mockResolvedValue({
          service_instance_id: uuidv4() as ServiceInstanceId,
          registerer_id: uuidv4(),
          platform_id: uuidv4(),
          tenant_id: null,
          tenant_name: null,
          platform_url: 'http://example.com',
          platform_title: 'OpenCTI',
          platform_version: '1.0.0',
          platform_contract: PlatformContract.Trial,
          token: 'token',
          status: PlatformConfigurationStatus.Active,
          last_connectivity_check: new Date(),
        });

        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          start_date: new Date(2025, 12, 1),
          end_date: new Date(2026, 1, 1),
          actual_state: DeploymentRequestPlatformState.Active,
          platform_id: uuidv4(),
        });

        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          template: 'free_trial_registered',
          params: {
            firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            platformUrl: 'http://example.com',
            platformIdentifier: PlatformIdentifier.Opencti,
            globalServiceInstanceId: toGlobalId(
              'ServiceInstance',
              initialDeployment.service_instance_id
            ),
          },
        });

        mockSendMail.mockClear();

        await DeploymentApp.updateDeploymentRequest({
          id: initialDeployment?.id as DeploymentRequestId,
          start_date: new Date(2025, 12, 1),
          end_date: new Date(2026, 1, 1),
          actual_state: DeploymentRequestPlatformState.Active,
        });

        expect(mockSendMail).not.toHaveBeenCalled();
      });
    });

    describe('bundle updates', () => {
      it('should update actual_state and platform_id only, ignoring bundle-unsupported fields', async () => {
        const bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
              start_date: null,
              end_date: null,
              ordering: 1,
              url: null,
            }
          );

        const updated = await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          platform_id: 'bundle-platform-id',
          start_date: new Date(2025, 1, 1),
          end_date: new Date(2025, 2, 1),
          ordering: 99,
          url: 'https://should-be-ignored.example.com',
        });

        expect(updated).toMatchObject({
          actual_state: DeploymentRequestPlatformState.Active,
          platform_id: 'bundle-platform-id',
          hub_status: DeploymentRequestHubStatus.Active,
          start_date: null,
          end_date: null,
          ordering: 1,
          url: null,
        });
      });
      it('should not initialise a service group for a bundle', async () => {
        const bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
            }
          );

        await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          platform_id: 'bundle-platform-id',
        });

        const serviceGroups = await ServiceGroupDomain.loadServiceGroups({
          service_instance_id: bundle.service_instance_id,
        });

        expect(serviceGroups).toHaveLength(0);
      });

      it('should transition hub_status through the same states as a product, driven by its own actual_state', async () => {
        const bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
            }
          );

        const provisioning = await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        expect(provisioning.hub_status).toBe(
          DeploymentRequestHubStatus.Provisioning
        );

        const active = await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
        });

        expect(active.hub_status).toBe(DeploymentRequestHubStatus.Active);
      });
    });

    describe('cascade to parent bundle', () => {
      let bundle: DeploymentRequest;
      let childA: DeploymentRequest;
      let childB: DeploymentRequest;

      beforeEach(async () => {
        bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
              start_date: null,
              end_date: null,
            }
          );

        childA =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id as DeploymentRequestId,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Provisioning,
              actual_state: DeploymentRequestPlatformState.Provisioning,
              start_date: new Date(2025, 1, 1),
              end_date: new Date(2025, 6, 1),
            }
          );

        childB =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id as DeploymentRequestId,
              platform_identifier: PlatformIdentifier.Openaev,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              start_date: new Date(2025, 2, 1),
              end_date: new Date(2025, 5, 1),
              platform_id: 'child-b-platform-id',
            }
          );
      });

      it('should aggregate dates from children without changing the bundle hub_status', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: childA.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date: childA.start_date as Date,
          end_date: childA.end_date as Date,
          platform_id: 'child-a-platform-id',
          url: 'https://child-a.example.com',
        });

        const updatedBundle =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: bundle.id as DeploymentRequestId,
          });

        expect(updatedBundle).toMatchObject({
          hub_status: DeploymentRequestHubStatus.Pending,
          start_date: new Date(2025, 1, 1),
          end_date: new Date(2025, 6, 1),
        });

        const updatedChildA =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: childA.id as DeploymentRequestId,
          });
        expect(updatedChildA?.url).toBe('https://child-a.example.com');

        expect(telemetrySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
            deployment_id: bundle.id,
            deployment_type: DeploymentRequestDeploymentType.Bundle,
            user_id: bundle.user_requester_id,
            parent_id: undefined,
            status: DeploymentRequestHubStatus.Pending,
          })
        );
      });

      it('should not update sibling children when the bundle itself is updated', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          platform_id: 'bundle-platform-id',
        });

        const untouchedChildA =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: childA.id as DeploymentRequestId,
          });
        const untouchedChildB =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: childB.id as DeploymentRequestId,
          });

        expect(untouchedChildA?.hub_status).toBe(
          DeploymentRequestHubStatus.Provisioning
        );
        expect(untouchedChildB?.hub_status).toBe(
          DeploymentRequestHubStatus.Active
        );
      });

      it.each([
        [DeploymentRequestHubStatus.Cancelled],
        [DeploymentRequestHubStatus.Expired],
      ])(
        'should not recompute dates for a %s bundle when a child is updated afterward',
        async (terminalHubStatus) => {
          await DeploymentRequestDomain.updateDeploymentRequestById(
            bundle.id as DeploymentRequestId,
            { hub_status: terminalHubStatus }
          );
          telemetrySpy.mockClear();

          await DeploymentApp.updateDeploymentRequest({
            id: childA.id as DeploymentRequestId,
            actual_state: DeploymentRequestPlatformState.Active,
            start_date: childA.start_date as Date,
            end_date: childA.end_date as Date,
            platform_id: 'child-a-platform-id',
          });

          const updatedBundle =
            await DeploymentRequestDomain.loadDeploymentRequestBy({
              id: bundle.id as DeploymentRequestId,
            });

          expect(updatedBundle?.hub_status).toBe(terminalHubStatus);
          expect(updatedBundle?.start_date).toBeNull();
          expect(updatedBundle?.end_date).toBeNull();

          expect(telemetrySpy).not.toHaveBeenCalledWith(
            expect.objectContaining({
              deployment_id: bundle.id,
              deployment_type: DeploymentRequestDeploymentType.Bundle,
            })
          );
        }
      );
    });

    describe('bundle mail', () => {
      let bundle: DeploymentRequest;
      let childA: DeploymentRequest;
      let childB: DeploymentRequest;

      beforeEach(async () => {
        bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
              start_date: null,
              end_date: null,
            }
          );

        childA =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id as DeploymentRequestId,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
            }
          );

        childB =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id as DeploymentRequestId,
              platform_identifier: PlatformIdentifier.Openaev,
              hub_status: DeploymentRequestHubStatus.Pending,
              actual_state: DeploymentRequestPlatformState.Unprovisioned,
            }
          );

        mockSendMail.mockClear();
      });

      it('should send the provisioning mail when the bundle itself starts provisioning', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          template: 'free_trial_bundle_provisioning',
          params: {
            firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            productNames: 'OpenAEV and OpenCTI',
            products: [PlatformIdentifier.Openaev, PlatformIdentifier.Opencti],
          },
        });
      });

      it('should send the active mail when the bundle itself becomes active', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: bundle.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
        });

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          template: 'free_trial_bundle_active',
          params: {
            firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            productNames: 'OpenAEV and OpenCTI',
            products: [PlatformIdentifier.Openaev, PlatformIdentifier.Opencti],
            platformUrl: `${config.get('base_url_front')}/app/xtm-platform-trial`,
          },
        });
      });

      it('should not send any bundle mail when its products are provisioned or active', async () => {
        await DeploymentApp.updateDeploymentRequest({
          id: childA.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Provisioning,
        });

        await DeploymentApp.updateDeploymentRequest({
          id: childB.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date: new Date(2025, 1, 1),
          end_date: new Date(2025, 2, 1),
          platform_id: 'child-b-platform-id',
        });

        await DeploymentApp.updateDeploymentRequest({
          id: childA.id as DeploymentRequestId,
          actual_state: DeploymentRequestPlatformState.Active,
          start_date: new Date(2025, 1, 1),
          end_date: new Date(2025, 2, 1),
          platform_id: 'child-a-platform-id',
        });

        expect(mockSendMail).not.toHaveBeenCalled();

        const untouchedBundle =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: bundle.id as DeploymentRequestId,
          });
        expect(untouchedBundle?.hub_status).toBe(
          DeploymentRequestHubStatus.Pending
        );
      });
    });
  });
  describe('loadTrialDeployments', () => {
    it('should return all available when no DeploymentRequest and no PlatformIdentifier specified', async () => {
      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      expect(trialDeployments).toEqual({
        availableTrials: expect.arrayContaining([
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ]),
        deployed: [],
        isBlacklisted: false,
      });
      expect(trialDeployments.availableTrials).toHaveLength(2);
    });
    it('should return only requested platform identifier specified as available when no DeploymentRequest exist', async () => {
      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [PlatformIdentifier.Opencti],
        deployed: [],
        isBlacklisted: false,
      });
    });

    it('should return blacklisted = true if orga is blacklisted', async () => {
      await CompetitorDomain.insertCompetitor({
        id: uuidv4() as CompetitorId,
        name: 'Filigran',
        tier: CompetitorTier.Tier1,
        domain: TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST,
      });

      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [PlatformIdentifier.Opencti],
        deployed: [],
        isBlacklisted: true,
      });

      await TestHelper.competitor.delete({});
    });
    it('should return trial as available if the created one does not count in quota', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          counts_in_orga_quota: false,
        }
      );

      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [PlatformIdentifier.Opencti],
        deployed: [],
        isBlacklisted: false,
      });
    });

    it('should not return identifier as available when DeploymentRequest exist', async () => {
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );

      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [],
        deployed: [
          {
            serviceInstanceId: deploymentRequest!.service_instance_id,
            platformIdentifier: deploymentRequest?.platform_identifier,
          },
        ],
        isBlacklisted: false,
      });
    });
    it('should return data corresponding to the right organization', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );

      requestContext.set(requestContextAdminSecondOrga);
      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [PlatformIdentifier.Opencti],
        deployed: [],
        isBlacklisted: false,
      });
    });
    it('should return not availablity and no deployed for personal space', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );

      const contextUserWithPersonalOrga: PortalContext = {
        ...contextSimpleUserSecondOrga,
        user: {
          ...contextSimpleUserSecondOrga.user,
          selected_organization_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE
              .PERSONAL_SPACE_ID,
        },
      };

      requestContext.set({
        user: contextUserWithPersonalOrga.user,
      });

      const trialDeployments = await DeploymentApp.loadTrialDeployments({
        organizationId:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.PERSONAL_SPACE_ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      expect(trialDeployments).toEqual({
        availableTrials: [],
        deployed: [],
        isBlacklisted: false,
      });
    });
    it('should throw if user does not belong in the organization', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {}
      );

      requestContext.set(requestContextAdminSecondOrga);

      const call = DeploymentApp.loadTrialDeployments({
        organizationId: TEST_ORGANIZATIONS.FILIGRAN.ID,
        platformIdentifiers: [PlatformIdentifier.Opencti],
      });

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });
  });
  describe('loadPlatformTrialStatus', () => {
    it('should return null hub_status and end_date when no bundle DeploymentRequest exists', async () => {
      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      expect(platformTrialStatus).toEqual({
        ongoingStandaloneTrials: [],
        isBlacklisted: false,
        hub_status: null,
        end_date: null,
      });
    });

    it('should return the bundle hub_status and end_date when a bundle DeploymentRequest exists', async () => {
      const endDate = new Date(Date.UTC(2025, 5, 1));
      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: endDate,
          }
        );

      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      expect(platformTrialStatus).toEqual({
        ongoingStandaloneTrials: [],
        isBlacklisted: false,
        hub_status: DeploymentRequestHubStatus.Active,
        end_date: bundle.end_date,
      });
    });

    it('should treat a bundle DeploymentRequest as non-existent when counts_in_orga_quota is false', async () => {
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          type: DeploymentRequestDeploymentType.Bundle,
          platform_identifier: null,
          hub_status: DeploymentRequestHubStatus.Active,
          end_date: new Date(Date.UTC(2025, 5, 1)),
          counts_in_orga_quota: false,
        }
      );

      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      expect(platformTrialStatus).toEqual({
        ongoingStandaloneTrials: [],
        isBlacklisted: false,
        hub_status: null,
        end_date: null,
      });
    });

    it('should return blacklisted = true if orga is blacklisted', async () => {
      await CompetitorDomain.insertCompetitor({
        id: uuidv4() as CompetitorId,
        name: 'Filigran',
        tier: CompetitorTier.Tier1,
        domain: TEST_ORGANIZATIONS.FILIGRAN.DOMAINS.FIRST,
      });

      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      expect(platformTrialStatus).toEqual({
        ongoingStandaloneTrials: [],
        isBlacklisted: true,
        hub_status: null,
        end_date: null,
      });

      await TestHelper.competitor.delete({});
    });

    it('should return null hub_status and end_date for personal space, even with a bundle in another organization', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          type: DeploymentRequestDeploymentType.Bundle,
          platform_identifier: null,
          hub_status: DeploymentRequestHubStatus.Active,
          end_date: new Date(Date.UTC(2025, 5, 1)),
        }
      );

      const contextUserWithPersonalOrga: PortalContext = {
        ...contextSimpleUserSecondOrga,
        user: {
          ...contextSimpleUserSecondOrga.user,
          selected_organization_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE
              .PERSONAL_SPACE_ID,
        },
      };

      requestContext.set({
        user: contextUserWithPersonalOrga.user,
      });

      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.PERSONAL_SPACE_ID
      );

      expect(platformTrialStatus).toEqual({
        ongoingStandaloneTrials: [],
        isBlacklisted: false,
        hub_status: null,
        end_date: null,
      });
    });

    it('should throw if user does not belong in the organization', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      const call = DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should report the standalone product as ongoing when the organization has an active standalone trial', async () => {
      // Given an organization with an ongoing standalone OpenCTI trial
      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          platform_identifier: PlatformIdentifier.Opencti,
          hub_status: DeploymentRequestHubStatus.Active,
        }
      );

      // When loading the platform trial status
      const platformTrialStatus = await DeploymentApp.loadPlatformTrialStatus(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      );

      // Then the standalone product is reported as ongoing
      expect(platformTrialStatus.ongoingStandaloneTrials).toEqual([
        PlatformIdentifier.Opencti,
      ]);
    });
  });

  describe('reorderDeploymentRequestInQueue', () => {
    it('should throw when deployment request is not found', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(undefined);

      const call = DeploymentApp.reorderDeploymentRequestInQueue({
        id: uuidv4() as DeploymentRequestId,
        direction: ReorderDeploymentRequestInQueueDirection.Top,
      });

      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });

    it('should throw when deployment request is not in queue', async () => {
      const deploymentRequest = {
        id: uuidv4() as DeploymentRequestId,
        hub_status: DeploymentRequestHubStatus.Active,
      } as Awaited<
        ReturnType<typeof DeploymentRequestDomain.loadDeploymentRequestBy>
      >;
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(deploymentRequest);

      const call = DeploymentApp.reorderDeploymentRequestInQueue({
        id: deploymentRequest!.id,
        direction: ReorderDeploymentRequestInQueueDirection.Top,
      });

      await expect(call).rejects.toThrow(
        ErrorCode.DeploymentRequestHubStatusNotQueued
      );
    });

    it('should reorder deployment request to top when direction is top', async () => {
      const deploymentRequest = {
        id: uuidv4() as DeploymentRequestId,
        hub_status: DeploymentRequestHubStatus.Queued,
      } as Awaited<
        ReturnType<typeof DeploymentRequestDomain.loadDeploymentRequestBy>
      >;
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(deploymentRequest);

      const reorderDeploymentRequestToTopSpy = vi
        .spyOn(DeploymentRequestDomain, 'reorderDeploymentRequestToTop')
        .mockResolvedValue();

      const result = await DeploymentApp.reorderDeploymentRequestInQueue({
        id: uuidv4() as DeploymentRequestId,
        direction: ReorderDeploymentRequestInQueueDirection.Top,
      });

      expect(result.success).toBeTruthy();
      expect(reorderDeploymentRequestToTopSpy).toHaveBeenCalledWith(
        deploymentRequest
      );
    });

    it('should reorder deployment request up when direction is up', async () => {
      const deploymentRequest = {
        id: uuidv4() as DeploymentRequestId,
        hub_status: DeploymentRequestHubStatus.Queued,
      } as Awaited<
        ReturnType<typeof DeploymentRequestDomain.loadDeploymentRequestBy>
      >;
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(deploymentRequest);

      const reorderDeploymentRequestUpSpy = vi
        .spyOn(DeploymentRequestDomain, 'reorderDeploymentRequestUp')
        .mockResolvedValue();

      const result = await DeploymentApp.reorderDeploymentRequestInQueue({
        id: uuidv4() as DeploymentRequestId,
        direction: ReorderDeploymentRequestInQueueDirection.Up,
      });

      expect(result.success).toBeTruthy();
      expect(reorderDeploymentRequestUpSpy).toHaveBeenCalledWith(
        deploymentRequest
      );
    });
  });

  describe('cancelDeploymentRequest', () => {
    let freePlaceSpy: MockInstance;
    beforeEach(() => {
      freePlaceSpy = vi
        .spyOn(DeploymentQuotaDomain, 'freePlace')
        .mockResolvedValue();
    });
    it.each`
      isAdmin  | hub_status                                 | actual_state                                    | counts_in_orga_quota | target_state
      ${false} | ${DeploymentRequestHubStatus.Provisioning} | ${DeploymentRequestPlatformState.Provisioning}  | ${false}             | ${DeploymentRequestPlatformState.Removed}
      ${false} | ${DeploymentRequestHubStatus.Pending}      | ${DeploymentRequestPlatformState.Unprovisioned} | ${false}             | ${DeploymentRequestPlatformState.Unprovisioned}
      ${false} | ${DeploymentRequestHubStatus.Queued}       | ${DeploymentRequestPlatformState.Unprovisioned} | ${false}             | ${DeploymentRequestPlatformState.Unprovisioned}
      ${false} | ${DeploymentRequestHubStatus.Active}       | ${DeploymentRequestPlatformState.Active}        | ${true}              | ${DeploymentRequestPlatformState.Removed}
      ${true}  | ${DeploymentRequestHubStatus.Provisioning} | ${DeploymentRequestPlatformState.Provisioning}  | ${true}              | ${DeploymentRequestPlatformState.Removed}
      ${true}  | ${DeploymentRequestHubStatus.Pending}      | ${DeploymentRequestPlatformState.Unprovisioned} | ${true}              | ${DeploymentRequestPlatformState.Unprovisioned}
      ${true}  | ${DeploymentRequestHubStatus.Queued}       | ${DeploymentRequestPlatformState.Unprovisioned} | ${true}              | ${DeploymentRequestPlatformState.Unprovisioned}
      ${true}  | ${DeploymentRequestHubStatus.Active}       | ${DeploymentRequestPlatformState.Active}        | ${true}              | ${DeploymentRequestPlatformState.Removed}
    `(
      'should cancel deployment request actual state $actual_state, with counts_in_orga_quota: counts_in_orga_quota',
      async ({
        isAdmin,
        hub_status,
        actual_state,
        counts_in_orga_quota,
        target_state,
      }) => {
        // Given a deployment request in the provided hub/actual state
        const initialDeployment =
          (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status,
              actual_state,
            }
          )) as DeploymentRequest;
        const cancellationReason = isAdmin ? undefined : 'my reason';

        // When cancelling the deployment request
        const deployment = await DeploymentApp.cancelDeploymentRequest(
          initialDeployment.id,
          isAdmin,
          cancellationReason
        );

        // Then the deployment request is updated accordingly
        expect(deployment).toMatchObject({
          hub_status: DeploymentRequestHubStatus.Cancelled,
          target_state: target_state,
          counts_in_orga_quota,
          cancellation_date: expect.any(Date),
          cancellation_user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          cancellation_reason: isAdmin ? null : cancellationReason,
        });

        const serviceInstance =
          await ServiceInstanceDomain.loadServiceInstanceBy({
            id: initialDeployment.service_instance_id,
          });
        expect(serviceInstance?.creation_status).toBe(
          counts_in_orga_quota
            ? ServiceInstanceCreationStatus.Pending
            : ServiceInstanceCreationStatus.Disabled
        );

        if (
          [
            DeploymentRequestHubStatus.Active,
            DeploymentRequestHubStatus.Pending,
            DeploymentRequestHubStatus.Provisioning,
          ].includes(hub_status)
        ) {
          expect(freePlaceSpy).toHaveBeenCalledWith(
            bundleQuotaKey(initialDeployment.region)
          );
          expect(freePlaceSpy).toHaveBeenCalledWith(
            trialQuotaKey(
              initialDeployment.platform_identifier!,
              initialDeployment.region
            )
          );
        } else {
          expect(freePlaceSpy).not.toHaveBeenCalled();
        }
      }
    );
    it('should throw if deployment request does not exist', async () => {
      const call = DeploymentApp.cancelDeploymentRequest(
        uuidv4() as DeploymentRequestId,
        false
      );

      await expect(call).rejects.toThrow(
        NotFoundErrorCode.DeploymentRequestNotFound
      );
    });

    it('should throw if user is not in organization and not isAdmin', async () => {
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        )) as DeploymentRequest;
      requestContext.set(requestContextAdminSecondOrga);

      const call = DeploymentApp.cancelDeploymentRequest(deployment.id, false);

      await expect(call).rejects.toThrow(
        ForbiddenErrorCode.UserIsNotInOrganization
      );
    });

    it('should not throw if user is not in organization and isAdmin', async () => {
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        )) as DeploymentRequest;
      requestContext.set(requestContextAdminSecondOrga);

      const response = await DeploymentApp.cancelDeploymentRequest(
        deployment.id,
        true
      );

      expect(response).toBeTruthy();
    });
    it('should send a telemetry event', async () => {
      const deployment =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {}
        );
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);

      await DeploymentApp.cancelDeploymentRequest(
        deployment.id,
        false,
        'CancellationReason'
      );

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        deployment_id: deployment.id,
        deployment_type: DeploymentRequestDeploymentType.Trial,
        status: DeploymentRequestHubStatus.Cancelled,
        start_date: null,
        end_date: null,
        platform_id: null,
        cancellation_reason: 'CancellationReason',
        parent_id: undefined,
      });
    });
    it.each`
      isAdmin  | description
      ${false} | ${'as a customer'}
      ${true}  | ${'as a platform admin'}
    `(
      'should refuse to cancel a single product of a bundle $description',
      async ({ isAdmin }) => {
        // Given a bundle with an active child product
        const bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
            }
          );
        const child =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id as DeploymentRequestId,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
            }
          );

        // When cancelling the child product directly
        const call = DeploymentApp.cancelDeploymentRequest(
          child.id,
          isAdmin,
          'my reason'
        );

        // Then it throws a forbidden error and leaves both untouched
        await expect(call).rejects.toThrow(
          ForbiddenErrorCode.CantCancelBundleProduct
        );
        await TestHelper.deploymentRequest.assertProperties(child.id, {
          hub_status: DeploymentRequestHubStatus.Active,
          cancellation_date: null,
          cancellation_reason: null,
        });
        await TestHelper.deploymentRequest.assertProperties(
          bundle.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Active }
        );
        expect(freePlaceSpy).not.toHaveBeenCalled();
      }
    );
    it('should send a mail to the trial requester', async () => {
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            user_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          }
        )) as DeploymentRequest;

      await DeploymentApp.cancelDeploymentRequest(deployment.id, true);

      expect(mockSendMail).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
        template: 'free_trial_cancelled',
        params: {
          firstName: '',
          platformIdentifier: PlatformIdentifier.Opencti,
        },
      });
    });

    it.each`
      platformIdentifier            | description
      ${PlatformIdentifier.Opencti} | ${'a standalone OpenCTI trial'}
      ${PlatformIdentifier.Openaev} | ${'a standalone OpenAEV trial'}
    `(
      'should attempt to delete the Auth0 audience for $description',
      async ({ platformIdentifier }) => {
        // Given a deployment request that should have an Auth0 audience
        const deleteAudienceSpy = vi.spyOn(
          auth0ClientMock,
          'deleteAudienceAPI'
        );
        const deployment =
          (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              platform_id: uuidv4(),
              platform_identifier: platformIdentifier,
            }
          )) as DeploymentRequest;

        // When cancelling the deployment request
        await DeploymentApp.cancelDeploymentRequest(deployment.id, true);

        // Then the Auth0 audience deletion is attempted
        expect(deleteAudienceSpy).toHaveBeenCalledWith(
          deployment.organization_requester_id,
          deployment.platform_id
        );
      }
    );

    it('should not attempt to delete the Auth0 audience for a standalone XtmOne trial', async () => {
      // Given a standalone XtmOne trial, which never has an Auth0 audience
      const deleteAudienceSpy = vi.spyOn(auth0ClientMock, 'deleteAudienceAPI');
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            actual_state: DeploymentRequestPlatformState.Active,
            platform_id: uuidv4(),
            platform_identifier: PlatformIdentifier.Xtmone,
          }
        )) as DeploymentRequest;

      // When cancelling the deployment request
      await DeploymentApp.cancelDeploymentRequest(deployment.id, true);

      // Then the Auth0 audience deletion is never attempted
      expect(deleteAudienceSpy).not.toHaveBeenCalled();
    });

    it('should log an error when deleting a missing OpenCTI audience (404)', async () => {
      // Given a deletion of the Auth0 audience that fails with a 404
      vi.spyOn(auth0ClientMock, 'deleteAudienceAPI').mockRejectedValue({
        statusCode: 404,
      });
      const errorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {});
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            actual_state: DeploymentRequestPlatformState.Active,
            platform_id: uuidv4(),
            platform_identifier: PlatformIdentifier.Opencti,
          }
        )) as DeploymentRequest;

      // When cancelling the deployment request
      await DeploymentApp.cancelDeploymentRequest(deployment.id, true);

      // Then it logs an error
      expect(errorSpy).toHaveBeenCalledWith(
        'Unable to delete audience',
        expect.objectContaining({ deploymentRequestId: deployment.id })
      );
    });

    it('should log a warning instead of an error when deleting a missing OpenAEV audience (404)', async () => {
      // Given a deletion of the Auth0 audience that fails with a 404
      vi.spyOn(auth0ClientMock, 'deleteAudienceAPI').mockRejectedValue({
        statusCode: 404,
      });
      const errorSpy = vi.spyOn(logApp, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(logApp, 'warn').mockImplementation(() => {});
      const deployment =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            actual_state: DeploymentRequestPlatformState.Active,
            platform_id: uuidv4(),
            platform_identifier: PlatformIdentifier.Openaev,
          }
        )) as DeploymentRequest;

      // When cancelling the deployment request
      await DeploymentApp.cancelDeploymentRequest(deployment.id, true);

      // Then it logs a warning, not an error
      expect(warnSpy).toHaveBeenCalledWith(
        'No Auth0 audience to delete for OpenAEV trial',
        expect.objectContaining({ deploymentRequestId: deployment.id })
      );
      expect(errorSpy).not.toHaveBeenCalledWith(
        'Unable to delete audience',
        expect.anything()
      );
    });

    describe('quota', () => {
      beforeEach(async () => {
        freePlaceSpy.mockRestore();
        requestContext.set(requestContextRegistererUserSecondOrga);
        await resetQuotaAvailabilities();
      });

      it('should give back both places when a standalone trial is cancelled', async () => {
        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });

        await DeploymentApp.cancelDeploymentRequest(
          request.id as DeploymentRequestId,
          true
        );

        expect(await loadAvailability(bundleQuotaFilter)).toBe(5);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(5);
      });

      it('should give back nothing when a queued standalone trial is cancelled', async () => {
        await TestHelper.deploymentRequestQuota.update(
          productQuotaFilter(PlatformIdentifier.Opencti),
          { availability: 0 }
        );
        const queued = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(queued.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        await DeploymentApp.cancelDeploymentRequest(
          queued.id as DeploymentRequestId,
          true
        );

        expect(await loadAvailability(bundleQuotaFilter)).toBe(5);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(0);
      });

      it('should hand both places over to the trial promoted in place of a cancelled one', async () => {
        await TestHelper.deploymentRequestQuota.update(
          productQuotaFilter(PlatformIdentifier.Opencti),
          { availability: 1 }
        );

        const pending = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(pending.hub_status).toBe(DeploymentRequestHubStatus.Pending);

        requestContext.set(requestContextAdminUser);
        const queued = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(queued.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        await DeploymentApp.cancelDeploymentRequest(
          pending.id as DeploymentRequestId,
          true
        );

        expect(await loadAvailability(bundleQuotaFilter)).toBe(4);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(0);
        await TestHelper.deploymentRequest.assertProperties(
          queued.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Pending }
        );
      });

      it('should promote a queued bundle and its children when a standalone trial is cancelled', async () => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          availability: 1,
        });

        const standalone = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(standalone.hub_status).toBe(DeploymentRequestHubStatus.Pending);
        expect(await loadAvailability(bundleQuotaFilter)).toBe(0);

        requestContext.set(requestContextAdminUser);
        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Openaev],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });
        expect(bundle.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        requestContext.set(requestContextRegistererUserSecondOrga);
        await DeploymentApp.cancelDeploymentRequest(
          standalone.id as DeploymentRequestId,
          true
        );

        expect(await loadAvailability(bundleQuotaFilter)).toBe(0);
        await TestHelper.deploymentRequest.assertProperties(
          bundle.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Pending }
        );
        const children = await TestHelper.deploymentRequest.loadMany({
          parent_id: bundle.id as DeploymentRequestId,
        });
        expect(children).toHaveLength(2);
        for (const child of children) {
          expect(child.hub_status).toBe(DeploymentRequestHubStatus.Pending);
        }
      });

      it('should promote the queued bundle rather than the queued trial, and give the product place back', async () => {
        await TestHelper.deploymentRequestQuota.update(bundleQuotaFilter, {
          availability: 1,
        });
        await TestHelper.deploymentRequestQuota.update(
          productQuotaFilter(PlatformIdentifier.Opencti),
          { availability: 1 }
        );

        const standalone = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(standalone.hub_status).toBe(DeploymentRequestHubStatus.Pending);

        requestContext.set(requestContextAdminUser);
        const queuedTrial = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        expect(queuedTrial.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        const queuedBundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Openaev],
          use_cases_by_product: [
            {
              platform_identifier: PlatformIdentifier.Openaev,
              use_case: DeploymentRequestUseCase.ThreatHunting,
            },
          ],
        });
        expect(queuedBundle.hub_status).toBe(DeploymentRequestHubStatus.Queued);

        requestContext.set(requestContextRegistererUserSecondOrga);
        await DeploymentApp.cancelDeploymentRequest(
          standalone.id as DeploymentRequestId,
          true
        );

        await TestHelper.deploymentRequest.assertProperties(
          queuedBundle.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Pending }
        );
        await TestHelper.deploymentRequest.assertProperties(
          queuedTrial.id as DeploymentRequestId,
          { hub_status: DeploymentRequestHubStatus.Queued }
        );
        expect(await loadAvailability(bundleQuotaFilter)).toBe(0);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(1);
      });
    });

    describe('bundle cancellation', () => {
      let bundle: DeploymentRequest;
      let childOpencti: DeploymentRequest;
      let childXtmone: DeploymentRequest;

      beforeEach(async () => {
        bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
            }
          );
        childOpencti =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              platform_id: uuidv4(),
            }
          );
        childXtmone =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id,
              platform_identifier: PlatformIdentifier.Xtmone,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
            }
          );
      });

      it('should cancel the bundle and all its children with the cancellation reason', async () => {
        await DeploymentApp.cancelDeploymentRequest(
          bundle.id,
          false,
          'my reason'
        );

        for (const { id } of [bundle, childOpencti, childXtmone]) {
          const cancelled =
            await DeploymentRequestDomain.loadDeploymentRequestBy({ id });
          expect(cancelled).toMatchObject({
            hub_status: DeploymentRequestHubStatus.Cancelled,
            target_state: DeploymentRequestPlatformState.Removed,
            cancellation_reason: 'my reason',
            cancellation_date: expect.any(Date),
            cancellation_user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          });
        }
      });

      it('should send a single cancellation mail for the bundle and none for its products', async () => {
        mockSendMail.mockClear();

        await DeploymentApp.cancelDeploymentRequest(bundle.id, false, 'reason');

        expect(mockSendMail).toHaveBeenCalledTimes(1);
        expect(mockSendMail).toHaveBeenCalledWith({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          template: 'free_trial_bundle_cancelled',
          params: {
            firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
            productNames: 'OpenCTI and XTM One',
            products: [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone],
          },
        });
      });

      it('should only delete the Auth0 audience of the OpenCTI child', async () => {
        const deleteAudienceSpy = vi.spyOn(
          auth0ClientMock,
          'deleteAudienceAPI'
        );

        await DeploymentApp.cancelDeploymentRequest(
          bundle.id,
          false,
          'my reason'
        );

        // Then only the OpenCTI child's audience is deleted: bundles, XtmOne
        // children and OpenAEV bundle children never have one
        expect(deleteAudienceSpy).toHaveBeenCalledExactlyOnceWith(
          childOpencti.organization_requester_id,
          childOpencti.platform_id
        );
      });

      it('should send one telemetry event per deployment request', async () => {
        await DeploymentApp.cancelDeploymentRequest(
          bundle.id,
          false,
          'my reason'
        );

        expect(telemetrySpy).toHaveBeenCalledTimes(3);
        for (const { id } of [bundle, childOpencti, childXtmone]) {
          expect(telemetrySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
              deployment_id: id,
              status: DeploymentRequestHubStatus.Cancelled,
              cancellation_reason: 'my reason',
            })
          );
        }
      });

      it('should leave the whole bundle untouched when one row fails to be cancelled', async () => {
        const originalUpdate =
          DeploymentRequestDomain.updateDeploymentRequestById;
        let callCount = 0;
        vi.spyOn(
          DeploymentRequestDomain,
          'updateDeploymentRequestById'
        ).mockImplementation(async (id, data) => {
          callCount += 1;
          if (callCount === 2) {
            throw new Error('boom');
          }
          return originalUpdate(id, data);
        });

        const call = DeploymentApp.cancelDeploymentRequest(
          bundle.id,
          false,
          'my reason'
        );

        await expect(call).rejects.toThrow('boom');
        for (const { id, hub_status } of [bundle, childOpencti, childXtmone]) {
          const untouched =
            await DeploymentRequestDomain.loadDeploymentRequestBy({ id });
          expect(untouched?.hub_status).toBe(hub_status);
          expect(untouched?.cancellation_date).toBeNull();
        }
      });

      describe('quota', () => {
        beforeEach(async () => {
          freePlaceSpy.mockRestore();
          requestContext.set(requestContextRegistererUserSecondOrga);
          await resetQuotaAvailabilities();
        });

        it('should give back only the bundle place when a bundle with an active child is cancelled', async () => {
          const bundle = await DeploymentApp.createDeploymentRequest({
            ...TEST_DEPLOYMENT,
            region: QUOTA_REGION,
            type: DeploymentRequestDeploymentType.Bundle,
            products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
          });
          const [child] = await TestHelper.deploymentRequest.loadMany({
            parent_id: bundle.id as DeploymentRequestId,
            platform_identifier: PlatformIdentifier.Opencti,
          });
          await DeploymentRequestDomain.updateDeploymentRequestById(child!.id, {
            hub_status: DeploymentRequestHubStatus.Active,
          });

          await DeploymentApp.cancelDeploymentRequest(
            bundle.id as DeploymentRequestId,
            false
          );

          expect(await loadAvailability(bundleQuotaFilter)).toBe(5);
          expect(
            await loadAvailability(
              productQuotaFilter(PlatformIdentifier.Opencti)
            )
          ).toBe(5);
          await TestHelper.deploymentRequest.assertProperties(child!.id, {
            hub_status: DeploymentRequestHubStatus.Cancelled,
          });
        });
      });
    });
  });

  describe('updateDeploymentQuotaCapacity', () => {
    const platformIdentifier = PlatformIdentifier.Opencti;
    const region = DeploymentRequestPlatformRegion.EuWest;
    beforeEach(async () => {
      await TestHelper.deploymentRequest.delete({});
    });

    const bundleFilter = {
      region,
      type: DeploymentRequestDeploymentType.Bundle,
    };

    const insertRequest = async (
      hubStatus: DeploymentRequestHubStatus,
      ordering: number = 1
    ): Promise<DeploymentRequest> => {
      const request =
        (await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            platform_identifier: platformIdentifier,
            region,
            hub_status: hubStatus,
            ordering,
          }
        ))!;

      if (hubStatus === DeploymentRequestHubStatus.Pending) {
        const bundleQuota =
          await TestHelper.deploymentRequestQuota.load(bundleFilter);
        await TestHelper.deploymentRequestQuota.update(bundleFilter, {
          availability: bundleQuota!.availability - 1,
        });
      }

      return request;
    };

    const initQuota = async ({
      capacity,
      availability,
    }: {
      capacity: number;
      availability: number;
    }) => {
      await TestHelper.deploymentRequestQuota.update(
        {
          platform_identifier: platformIdentifier,
          region,
        },
        {
          capacity,
          availability,
        }
      );
    };

    const assertQuota = async ({
      capacity,
      availability,
    }: {
      capacity: number;
      availability: number;
    }) => {
      const newQuota = await TestHelper.deploymentRequestQuota.load({
        platform_identifier: platformIdentifier,
        region,
      });

      expect(newQuota).toMatchObject({
        capacity: capacity,
        availability: availability,
      });
    };

    describe('increase capacity', () => {
      it('should move queued request to pending when there is space available', async () => {
        await initQuota({ capacity: 2, availability: 0 });
        const { id: activeRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: pendingRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Pending,
          2
        );
        const { id: queuedRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Queued,
          7
        );
        const { id: queuedRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Queued,
          4
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 4,
        });

        await assertQuota({ capacity: 4, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId, {
          hub_status: DeploymentRequestHubStatus.Pending,
          ordering: 2,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId1, {
          hub_status: DeploymentRequestHubStatus.Pending,
          ordering: 4,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId2, {
          hub_status: DeploymentRequestHubStatus.Pending,
          ordering: 3,
        });
      });

      it('should not move queued request to pending when there is just enough space for active', async () => {
        await initQuota({ capacity: 1, availability: -1 });
        const { id: activeRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: activeRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: queuedRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Queued
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 2,
        });

        await assertQuota({ capacity: 2, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId1, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(activeRequestId2, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
      });

      it('should not move queued request to pending when there is not more space available', async () => {
        await initQuota({ capacity: 1, availability: -2 });
        const { id: activeRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: activeRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: activeRequestId3 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: queuedRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Queued
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 2,
        });

        await assertQuota({ capacity: 2, availability: -1 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId1, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(activeRequestId2, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(activeRequestId3, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
      });

      it('should send telemetry event for each request moved', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        await initQuota({ capacity: 0, availability: 0 });

        const { id: queuedRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Queued
        );
        const { id: queuedRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Queued
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 2,
        });

        await assertQuota({ capacity: 2, availability: 0 });

        expect(telemetrySpy).toHaveBeenCalledTimes(2);
        expect(telemetrySpy).toHaveBeenCalledWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          deployment_id: queuedRequestId1!,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: null,
          end_date: null,
          start_date: null,
          status: DeploymentRequestHubStatus.Pending,
          parent_id: undefined,
        });
        expect(telemetrySpy).toHaveBeenCalledWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          deployment_id: queuedRequestId2!,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: null,
          end_date: null,
          start_date: null,
          status: DeploymentRequestHubStatus.Pending,
          parent_id: undefined,
        });
      });
    });
    describe('decrease capacity', () => {
      it('should release pending requests from availability', async () => {
        await initQuota({ capacity: 1, availability: 0 });
        const { id: pendingRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 0,
        });

        await assertQuota({ capacity: 0, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(pendingRequestId, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
      });

      it('should only release pending requests until availability is equal to zero', async () => {
        await initQuota({ capacity: 2, availability: 0 });
        const { id: pendingRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );
        const { id: pendingRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 1,
        });

        await assertQuota({ capacity: 1, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(pendingRequestId1, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId2, {
          hub_status: DeploymentRequestHubStatus.Pending,
        });
      });

      it('should move pending requests to queued with the right ordering', async () => {
        await initQuota({ capacity: 2, availability: 0 });
        const { id: pendingRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Pending,
          4
        );
        const { id: pendingRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Pending,
          3
        );
        const { id: queuedRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Queued,
          2
        );
        const { id: queuedRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Queued,
          5
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 0,
        });

        await assertQuota({ capacity: 0, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(pendingRequestId1, {
          hub_status: DeploymentRequestHubStatus.Queued,
          ordering: 2,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId2, {
          hub_status: DeploymentRequestHubStatus.Queued,
          ordering: 1,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId1, {
          hub_status: DeploymentRequestHubStatus.Queued,
          ordering: 4,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId2, {
          hub_status: DeploymentRequestHubStatus.Queued,
          ordering: 7,
        });
      });

      it('should move only pending requests to free place when new availability is negative', async () => {
        await initQuota({ capacity: 3, availability: 0 });
        const { id: activeRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: activeRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: pendingRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );
        const { id: queuedRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Queued
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 1,
        });

        await assertQuota({ capacity: 1, availability: -1 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId1, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(activeRequestId2, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
        await TestHelper.deploymentRequest.assertProperties(queuedRequestId, {
          hub_status: DeploymentRequestHubStatus.Queued,
        });
      });
      it('should not move pending requests to queue when new availability is equal to zero', async () => {
        await initQuota({ capacity: 3, availability: 1 });
        const { id: activeRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: pendingRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 2,
        });

        await assertQuota({ capacity: 2, availability: 0 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId, {
          hub_status: DeploymentRequestHubStatus.Pending,
        });
      });
      it('should not move pending requests to queue when new availability is positive', async () => {
        await initQuota({ capacity: 4, availability: 2 });
        const { id: activeRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Active
        );
        const { id: pendingRequestId } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 3,
        });

        await assertQuota({ capacity: 3, availability: 1 });

        await TestHelper.deploymentRequest.assertProperties(activeRequestId, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
        await TestHelper.deploymentRequest.assertProperties(pendingRequestId, {
          hub_status: DeploymentRequestHubStatus.Pending,
        });
      });

      it('should send telemetry event for each request moved', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        await initQuota({ capacity: 2, availability: 0 });

        const { id: pendingRequestId1 } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );
        const { id: pendingRequestId2 } = await insertRequest(
          DeploymentRequestHubStatus.Pending
        );

        await DeploymentApp.updateDeploymentQuotaCapacity({
          platformIdentifier,
          region,
          newCapacity: 0,
        });

        await assertQuota({ capacity: 0, availability: 0 });

        expect(telemetrySpy).toHaveBeenCalledTimes(2);
        expect(telemetrySpy).toHaveBeenCalledWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          deployment_id: pendingRequestId1!,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: null,
          end_date: null,
          start_date: null,
          status: DeploymentRequestHubStatus.Queued,
          parent_id: undefined,
        });
        expect(telemetrySpy).toHaveBeenCalledWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          deployment_id: pendingRequestId2!,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: null,
          end_date: null,
          start_date: null,
          status: DeploymentRequestHubStatus.Queued,
          parent_id: undefined,
        });
      });
    });
  });

  describe('expireTrials', () => {
    let freePlaceSpy: MockInstance;
    beforeEach(() => {
      freePlaceSpy = vi
        .spyOn(DeploymentQuotaDomain, 'freePlace')
        .mockResolvedValue();
    });

    it('should expire past trials only', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);

      const expiredTrial =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Active,
            end_date: new Date(Date.UTC(2025, 1, 1)),
          }
        );
      const nonExpiredTrial =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            actual_state: DeploymentRequestPlatformState.Active,
            end_date: new Date(Date.UTC(2025, 1, 5)),
          }
        );

      await DeploymentApp.expireTrials();

      const expiredDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: expiredTrial?.id as DeploymentRequestId,
        });
      const nonExpiredDeploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          id: nonExpiredTrial?.id as DeploymentRequestId,
        });

      expect(expiredDeploymentRequest).toMatchObject({
        hub_status: DeploymentRequestHubStatus.Expired,
        target_state: DeploymentRequestPlatformState.Removed,
      });

      expect(nonExpiredDeploymentRequest).toMatchObject({
        hub_status: DeploymentRequestHubStatus.Active,
        target_state: DeploymentRequestPlatformState.Active,
      });

      expect(freePlaceSpy).toHaveBeenCalledTimes(2);
      expect(freePlaceSpy).toHaveBeenCalledWith(
        bundleQuotaKey(expiredTrial!.region)
      );
      expect(freePlaceSpy).toHaveBeenCalledWith(
        trialQuotaKey(expiredTrial!.platform_identifier!, expiredTrial!.region)
      );
    });

    it.each`
      hub_status                                 | target_state
      ${DeploymentRequestHubStatus.Provisioning} | ${DeploymentRequestPlatformState.Active}
      ${DeploymentRequestHubStatus.Pending}      | ${DeploymentRequestPlatformState.Active}
      ${DeploymentRequestHubStatus.Queued}       | ${DeploymentRequestPlatformState.Unprovisioned}
      ${DeploymentRequestHubStatus.Cancelled}    | ${DeploymentRequestPlatformState.Removed}
      ${DeploymentRequestHubStatus.Expired}      | ${DeploymentRequestPlatformState.Removed}
    `(
      `should not expire trials in status $hub_status`,
      async ({ hub_status, target_state }) => {
        // Given a trial in a status that should not be expired
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);
        const expiredDate = new Date(Date.UTC(2025, 1, 1));
        const trial =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: hub_status,
              target_state: target_state,
              end_date: expiredDate,
            }
          );

        // When expiring trials
        await DeploymentApp.expireTrials();

        // Then the trial is left untouched
        const expiredDeploymentRequest =
          await DeploymentRequestDomain.loadDeploymentRequestBy({
            id: trial?.id as DeploymentRequestId,
          });

        expect(expiredDeploymentRequest).toMatchObject({
          hub_status: hub_status,
          target_state: target_state,
        });
      }
    );
    it('should send a mail to the requester', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const expiredDate = new Date(Date.UTC(2025, 1, 1));

      await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
        {
          hub_status: DeploymentRequestHubStatus.Active,
          target_state: DeploymentRequestPlatformState.Active,
          end_date: expiredDate,
          user_requester_id:
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        }
      );

      await DeploymentApp.expireTrials();

      expect(mockSendMail).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
        template: 'free_trial_expired',
        params: {
          firstName: '',
          platformIdentifier: PlatformIdentifier.Opencti,
        },
      });
    });

    it('should send a single expiration mail for a bundle and none for its products', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.UTC(2025, 1, 3, 13, 12, 15)));
      const expiredDate = new Date(Date.UTC(2025, 1, 1));

      const bundle =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            type: DeploymentRequestDeploymentType.Bundle,
            platform_identifier: null,
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            end_date: expiredDate,
          }
        );

      for (const platform_identifier of [
        PlatformIdentifier.Opencti,
        PlatformIdentifier.Openaev,
      ]) {
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            parent_id: bundle.id as DeploymentRequestId,
            platform_identifier,
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            end_date: expiredDate,
          }
        );
      }

      mockSendMail.mockClear();

      await DeploymentApp.expireTrials();

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        template: 'free_trial_bundle_expired',
        params: {
          firstName: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME,
          productNames: 'OpenAEV and OpenCTI',
          products: [PlatformIdentifier.Openaev, PlatformIdentifier.Opencti],
        },
      });
    });

    it('should send a telemetry event', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const start_date = new Date(2024, 12, 1);
      const end_date = new Date(2025, 1, 1);

      const trial =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Active,
            target_state: DeploymentRequestPlatformState.Active,
            start_date,
            end_date,
            user_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
            organization_requester_id:
              TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          }
        );

      await DeploymentApp.expireTrials();

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: SYSTEM_USER_UUID,
        deployment_id: trial?.id,
        deployment_type: DeploymentRequestDeploymentType.Trial,
        platform_id: null,
        start_date,
        end_date,
        status: DeploymentRequestHubStatus.Expired,
        parent_id: undefined,
      });
    });

    describe('bundle expiry', () => {
      let bundle: DeploymentRequest;
      let childOpencti: DeploymentRequest;
      let childXtmone: DeploymentRequest;

      beforeEach(async () => {
        const expiredDate = new Date(Date.UTC(2020, 0, 1));

        bundle =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              type: DeploymentRequestDeploymentType.Bundle,
              platform_identifier: null,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              end_date: expiredDate,
            }
          );
        childOpencti =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id,
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              end_date: expiredDate,
            }
          );
        childXtmone =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              parent_id: bundle.id,
              platform_identifier: PlatformIdentifier.Xtmone,
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              end_date: expiredDate,
            }
          );
      });

      it('should expire the bundle and all its children', async () => {
        await DeploymentApp.expireTrials();

        for (const { id } of [bundle, childOpencti, childXtmone]) {
          await TestHelper.deploymentRequest.assertProperties(id, {
            hub_status: DeploymentRequestHubStatus.Expired,
            target_state: DeploymentRequestPlatformState.Removed,
          });
        }
      });

      it('should not expire a standalone trial that is still running', async () => {
        const ongoingStandalone =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: DeploymentRequestHubStatus.Active,
              actual_state: DeploymentRequestPlatformState.Active,
              end_date: new Date(Date.UTC(2999, 0, 1)),
            }
          );

        await DeploymentApp.expireTrials();

        await TestHelper.deploymentRequest.assertProperties(
          ongoingStandalone.id,
          { hub_status: DeploymentRequestHubStatus.Active }
        );
      });

      it('should leave the whole bundle untouched when one row fails to be expired', async () => {
        const originalUpdate =
          DeploymentRequestDomain.updateDeploymentRequestById;
        let callCount = 0;
        vi.spyOn(
          DeploymentRequestDomain,
          'updateDeploymentRequestById'
        ).mockImplementation(async (id, data) => {
          callCount += 1;
          if (callCount === 2) {
            throw new Error('boom');
          }
          return originalUpdate(id, data);
        });

        await DeploymentApp.expireTrials();

        for (const { id } of [bundle, childOpencti, childXtmone]) {
          const untouched =
            await DeploymentRequestDomain.loadDeploymentRequestBy({ id });
          expect(untouched?.hub_status).toBe(DeploymentRequestHubStatus.Active);
        }
      });

      it('should not re-expire a child that is already cancelled', async () => {
        await DeploymentRequestDomain.updateDeploymentRequestById(
          childXtmone.id,
          {
            hub_status: DeploymentRequestHubStatus.Cancelled,
            cancellation_date: new Date(),
          }
        );

        await DeploymentApp.expireTrials();

        await TestHelper.deploymentRequest.assertProperties(childXtmone.id, {
          hub_status: DeploymentRequestHubStatus.Cancelled,
        });
        await TestHelper.deploymentRequest.assertProperties(bundle.id, {
          hub_status: DeploymentRequestHubStatus.Expired,
        });
      });
    });

    describe('quota', () => {
      beforeEach(async () => {
        freePlaceSpy.mockRestore();
        requestContext.set(requestContextRegistererUserSecondOrga);
        await TestHelper.deploymentRequest.delete({});
        await resetQuotaAvailabilities();
      });

      it('should give back both places when a standalone trial is expired', async () => {
        const request = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          products: [PlatformIdentifier.Opencti],
        });
        await DeploymentRequestDomain.updateDeploymentRequestById(
          request.id as DeploymentRequestId,
          {
            hub_status: DeploymentRequestHubStatus.Active,
            end_date: new Date(Date.UTC(2025, 0, 1)),
          }
        );

        await DeploymentApp.expireTrials();

        expect(await loadAvailability(bundleQuotaFilter)).toBe(5);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(5);
      });

      it('should give back nothing when a bundle child is expired', async () => {
        const bundle = await DeploymentApp.createDeploymentRequest({
          ...TEST_DEPLOYMENT,
          region: QUOTA_REGION,
          type: DeploymentRequestDeploymentType.Bundle,
          products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        });
        const [child] = await TestHelper.deploymentRequest.loadMany({
          parent_id: bundle.id as DeploymentRequestId,
          platform_identifier: PlatformIdentifier.Opencti,
        });
        await DeploymentRequestDomain.updateDeploymentRequestById(child!.id, {
          hub_status: DeploymentRequestHubStatus.Active,
          end_date: new Date(Date.UTC(2025, 0, 1)),
        });

        await DeploymentApp.expireTrials();

        expect(await loadAvailability(bundleQuotaFilter)).toBe(4);
        expect(
          await loadAvailability(productQuotaFilter(PlatformIdentifier.Opencti))
        ).toBe(4);
        await TestHelper.deploymentRequest.assertProperties(child!.id, {
          hub_status: DeploymentRequestHubStatus.Active,
        });
      });
    });
  });

  describe('releaseDeploymentRequestPlace', () => {
    let freePlaceSpy: MockInstance;
    beforeEach(() => {
      freePlaceSpy = vi
        .spyOn(DeploymentQuotaDomain, 'freePlace')
        .mockResolvedValue();
    });

    describe('not counted in quotas', () => {
      it.each`
        hub_status
        ${DeploymentRequestHubStatus.Cancelled}
        ${DeploymentRequestHubStatus.Expired}
        ${DeploymentRequestHubStatus.Failed}
        ${DeploymentRequestHubStatus.Queued}
      `(
        'should not free place when request hub status is $hub_status',
        async ({ hub_status }) => {
          // Given a deployment request in a status not counted in quotas
          const deploymentRequest =
            await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
              {
                hub_status,
              }
            );

          // When releasing its place
          await DeploymentCancellationApp.releaseDeploymentRequestPlace(
            deploymentRequest!.hub_status,
            deploymentRequest!
          );

          // Then no place is freed
          expect(freePlaceSpy).not.toHaveBeenCalled();
        }
      );
    });

    describe('telemetry', () => {
      beforeEach(async () => {
        await resetQuotaAvailabilities();
      });

      it('should not send telemetry event when deployment request was not moved to pending', async () => {
        const deploymentRequest =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: DeploymentRequestHubStatus.Active,
            }
          );

        await DeploymentCancellationApp.releaseDeploymentRequestPlace(
          deploymentRequest!.hub_status,
          deploymentRequest!
        );

        expect(telemetrySpy).not.toHaveBeenCalled();
      });

      it('should send telemetry event when deployment request was moved to pending', async () => {
        vi.useFakeTimers();
        const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
        vi.setSystemTime(date);

        const queuedDeploymentRequest =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: DeploymentRequestHubStatus.Queued,
              activity_sector:
                DeploymentRequestActivitySector.ComputerNetworkSecurity,
              region: DeploymentRequestPlatformRegion.UsEast,
              platform_id: uuidv4(),
            }
          );

        const deploymentRequest =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status: DeploymentRequestHubStatus.Active,
            }
          );

        await DeploymentCancellationApp.releaseDeploymentRequestPlace(
          deploymentRequest!.hub_status,
          deploymentRequest!
        );

        expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
          '@timestamp': '2025-02-03T13:12:15.000Z',
          event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
          organization_type: TelemetryOrganizationType.PROFESSIONAL,
          source: TelemetrySource.XTMHUB,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          deployment_id: queuedDeploymentRequest!.id,
          deployment_type: DeploymentRequestDeploymentType.Trial,
          platform_id: queuedDeploymentRequest!.platform_id,
          start_date: null,
          end_date: null,
          status: DeploymentRequestHubStatus.Pending,
          parent_id: undefined,
        });
      });
    });
  });

  describe('loadXtmPlatformBundle', () => {
    beforeEach(() => {
      requestContext.set(requestContextRegistererUserSecondOrga);
      vi.spyOn(DeploymentQuotaDomain, 'reservePlace').mockResolvedValue({
        isPlaceAvailable: true,
      });
    });

    const createActiveBundle = async () => {
      const bundle = await DeploymentApp.createDeploymentRequest({
        ...TEST_DEPLOYMENT,
        type: DeploymentRequestDeploymentType.Bundle,
        products: [
          PlatformIdentifier.Xtmone,
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Openaev,
        ],
        use_cases_by_product: [
          {
            platform_identifier: PlatformIdentifier.Opencti,
            use_case: DeploymentRequestUseCase.ThreatHunting,
          },
          {
            platform_identifier: PlatformIdentifier.Openaev,
            use_case: DeploymentRequestUseCase.OaevAttackSimulation,
          },
        ],
      });
      await DeploymentRequestDomain.updateDeploymentRequestById(bundle.id, {
        hub_status: DeploymentRequestHubStatus.Active,
        start_date: new Date('2025-01-01T00:00:00.000Z'),
        end_date: new Date('2025-01-31T00:00:00.000Z'),
      });
      return bundle;
    };

    it('should return null when the organization has no active bundle', async () => {
      const result = await DeploymentApp.loadXtmPlatformBundle();

      expect(result).toBeNull();
    });

    it('should return the active bundle for the organization', async () => {
      await createActiveBundle();

      const result = await DeploymentApp.loadXtmPlatformBundle();

      expect(result).toMatchObject({
        type: DeploymentRequestDeploymentType.Bundle,
        hub_status: DeploymentRequestHubStatus.Active,
        organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        requester_email:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.REGISTERER.EMAIL,
        start_date: expect.any(Date),
        end_date: expect.any(Date),
        service_instance_id: expect.any(String),
      });
    });
  });

  describe('loadXtmonePlatformIntegrationStatus', () => {
    const serviceInstanceId = uuidv4() as ServiceInstanceId;
    const user = contextRegistererUserSecondOrga.user;
    const ownedDeploymentRequest = { url: null } as unknown as Awaited<
      ReturnType<typeof DeploymentRequestDomain.loadDeploymentRequestBy>
    >;
    const integrationStatus = {
      opencti: { status: 'connected', connected: true, last_checked_at: null },
      openaev: { status: 'connected', connected: true, last_checked_at: null },
      linked: true,
      last_checked_at: null,
    };

    beforeEach(() => {
      requestContext.set(requestContextRegistererUserSecondOrga);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('returns null without fetching when the service instance is not owned by the user organization', async () => {
      const loadDeploymentRequestBySpy = vi
        .spyOn(DeploymentRequestDomain, 'loadDeploymentRequestBy')
        .mockResolvedValue(undefined);
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result =
        await DeploymentApp.loadXtmonePlatformIntegrationStatus(
          serviceInstanceId
        );

      expect(result).toBeNull();
      expect(loadDeploymentRequestBySpy).toHaveBeenCalledWith({
        service_instance_id: serviceInstanceId,
        organization_requester_id: user.selected_organization_id,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null without fetching when no platform url can be resolved', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(ownedDeploymentRequest);
      vi.spyOn(RegistrationDomain, 'loadRegisteredPlatform').mockResolvedValue(
        []
      );
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result =
        await DeploymentApp.loadXtmonePlatformIntegrationStatus(
          serviceInstanceId
        );

      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches the integration status from the registered platform url without credentials', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(ownedDeploymentRequest);
      vi.spyOn(RegistrationDomain, 'loadRegisteredPlatform').mockResolvedValue([
        { platform_url: 'https://xtmone.example.io' },
      ] as unknown as DomainRegisteredPlatform[]);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ integration_status: integrationStatus }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result =
        await DeploymentApp.loadXtmonePlatformIntegrationStatus(
          serviceInstanceId
        );

      expect(fetchMock).toHaveBeenCalledWith(
        'https://xtmone.example.io/api/v1/platform/config',
        expect.objectContaining({ credentials: 'omit', redirect: 'error' })
      );
      expect(result).toEqual(integrationStatus);
    });

    it('returns null when the platform responds with an error status', async () => {
      vi.spyOn(
        DeploymentRequestDomain,
        'loadDeploymentRequestBy'
      ).mockResolvedValue(ownedDeploymentRequest);
      vi.spyOn(RegistrationDomain, 'loadRegisteredPlatform').mockResolvedValue([
        { platform_url: 'https://xtmone.example.io' },
      ] as unknown as DomainRegisteredPlatform[]);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 502 })
      );

      const result =
        await DeploymentApp.loadXtmonePlatformIntegrationStatus(
          serviceInstanceId
        );

      expect(result).toBeNull();
    });
  });
});
