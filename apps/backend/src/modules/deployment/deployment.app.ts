import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateDeploymentRequestInput,
  DeploymentAvailability,
  DeploymentRequest,
  DeploymentRequestDeploymentType,
  DeploymentRequestFilterKey,
  DeploymentRequestHubStatus,
  DeploymentRequestOrdering,
  DeploymentRequestPlatformRegion,
  DeploymentRequestPlatformState,
  OrderingMode,
  PlatformConfigurationStatus,
  PlatformDeploymentRequest,
  PlatformDeploymentRequestConnection,
  PlatformIdentifier,
  PortalCapability,
  QueryDeploymentRequestsArgs,
  ReorderDeploymentRequestInQueueDirection,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
  ServiceInstanceTag,
  Success,
  TrialDeploymentsInput,
  UpdateDeploymentRequestInput,
  XtmoneIntegrationStatus,
} from '../../__generated__/resolvers-types';
import portalConfig from '../../config';
import {
  withAdvisoryLock,
  withTransaction,
} from '../../context/database.context';
import { requestContext } from '../../context/request.context';
import DeploymentRequestModel, {
  DeploymentRequestId,
  DeploymentRequestMutator,
} from '../../model/kanel/public/DeploymentRequest';
import Organization, {
  OrganizationId,
} from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { SubscriptionId } from '../../model/kanel/public/Subscription';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import {
  SYSTEM_USER_UUID,
  XTM_HUB_DEV_TEAM_EMAIL,
  XTM_HUB_SUPPORT_EMAIL,
} from '../../portal.const';
import { securityGuard } from '../../security/guard';
import { buildXtmPlatformTrialLink, sendMail } from '../../server/mail-service';
import {
  formatProductNames,
  FreeTrialBundleModel,
} from '../../server/mail-template/mail';
import { fetchXtmoneIntegrationStatus } from '../../thirdparty/xtmone/xtmone';
import { logApp } from '../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  ErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { formatName } from '../../utils/format';
import { ucfirst } from '../../utils/utils';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import {
  REGISTRABLE_PLATFORM_IDENTIFIERS,
  serviceInstanceTagMappedByPlatformIdentifier,
} from '../registration/registration.mapping';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { CompetitorApp } from './competitor/competitor.app';
import { DeploymentCancellationApp } from './deployment-cancellation.app';
import {
  DeploymentRequestDomain,
  isBundleChild,
  shouldDeleteDeploymentRequestAudience,
} from './deployment.domain';
import { DeploymentHelper } from './deployment.helper';
import { DeploymentQuotaApp } from './quota/deployment.quota.app';
import {
  bundleQuotaKey,
  DeploymentQuotaDomain,
  quotaKeysOfRequest,
  trialQuotaKey,
} from './quota/deployment.quota.domain';

export const XTM_PLATFORM_BUNDLE_SERVICE_INSTANCE_NAME = 'XTM Platform Bundle';

const DEPLOYMENT_REQUEST_LOCK_NAMESPACE = 'deployment_request';

export const DeploymentApp = {
  createDeploymentRequest: async (
    input: CreateDeploymentRequestInput
  ): Promise<DeploymentRequest> => {
    const user = requestContext.requireUser();

    const validatedProducts = validateDeploymentRequestProducts(input);

    const chosenOrganization = await OrganizationDomain.loadOrganizationBy({
      id: user.selected_organization_id,
    });

    if (!chosenOrganization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }

    if (chosenOrganization.personal_space) {
      logApp.warn('Free trial requests are not allowed in personal spaces');
      throw new Error(ErrorCode.CantRequestFreeTrialInPersonalSpace);
    }

    if (await CompetitorApp.isOrganizationBlacklisted(chosenOrganization)) {
      logApp.warn(
        `Free trial request is blocked as at least one of organization domains ('${chosenOrganization.domains?.join(', ')}') is blacklisted`
      );
      throw new Error(ErrorCode.CantRequestFreeTrial);
    }

    try {
      await DeploymentHelper.assertFreeTrialsLimit(
        user.selected_organization_id,
        validatedProducts
      );

      if (validatedProducts.type === DeploymentRequestDeploymentType.Bundle) {
        return await withAdvisoryLock(
          DEPLOYMENT_REQUEST_LOCK_NAMESPACE,
          user.selected_organization_id,
          async () => {
            await DeploymentHelper.assertFreeTrialsLimit(
              user.selected_organization_id,
              validatedProducts
            );

            return createBundleDeploymentRequest({
              user,
              chosenOrganization,
              input,
              products: validatedProducts.products,
            });
          }
        );
      }

      const { platformIdentifier } = validatedProducts;

      const createdDeploymentRequest = await withAdvisoryLock(
        DEPLOYMENT_REQUEST_LOCK_NAMESPACE,
        user.selected_organization_id,
        async () => {
          await DeploymentHelper.assertFreeTrialsLimit(
            user.selected_organization_id,
            validatedProducts
          );

          return createSingleDeploymentRequest({
            user,
            input,
            platformIdentifier,
            type: DeploymentRequestDeploymentType.Trial,
            parentId: null,
          });
        }
      );

      await sendDeploymentRequestCreatedNotifications({
        user,
        chosenOrganization,
        input,
        platformIdentifier,
        deploymentRequest: createdDeploymentRequest,
      });

      return DeploymentRequestDomain.loadDeploymentRequestBy({
        id: createdDeploymentRequest.id,
      }).then((result) => {
        if (!result)
          throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
        return result;
      });
    } catch (error) {
      logApp.error('unable to create deployment request', { error });
      throw error;
    }
  },

  updateDeploymentRequest: async (
    input: UpdateDeploymentRequestInput
  ): Promise<PlatformDeploymentRequest> => {
    const user = requestContext.requireUser();

    await securityGuard.assertUserPortalCapabilities(user, [
      PortalCapability.ManageDeployment,
      PortalCapability.ModifyTrials,
    ]);

    const deploymentRequestId = input.id;
    const deploymentRequest =
      await loadDeploymentRequestForUpdate(deploymentRequestId);
    await checkStatusAndDataValidity(deploymentRequest, input);

    const isBundle =
      deploymentRequest.type === DeploymentRequestDeploymentType.Bundle;
    const newStatus = resolveNextHubStatus(
      deploymentRequest,
      input.actual_state
    );

    await withTransaction(async () => {
      await applyDeploymentRequestUpdateInQuotaTransaction({
        deploymentRequest,
        deploymentRequestId,
        input,
        newStatus,
      });

      if (isBundle || !isBundleChild(deploymentRequest)) {
        return;
      }

      await recomputeBundleDates(deploymentRequest.parent_id);
    });

    const updatedDeploymentRequest =
      await DeploymentRequestDomain.loadFullDeploymentRequest({
        id: deploymentRequestId,
      });

    if (!updatedDeploymentRequest) {
      throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
    }

    await DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
      updatedDeploymentRequest,
      updatedDeploymentRequest.user_requester_id,
      deploymentRequest
    );

    if (
      !isBundleChild(deploymentRequest) &&
      newStatus !== deploymentRequest.hub_status
    ) {
      await sendStatusPlatformEmail(updatedDeploymentRequest, newStatus);
    }

    return updatedDeploymentRequest;
  },

  loadPlatformDeploymentRequests: async (
    args: QueryDeploymentRequestsArgs
  ): Promise<PlatformDeploymentRequestConnection> => {
    const user = requestContext.requireUser();

    await securityGuard.assertUserPortalCapabilities(user, [
      PortalCapability.ManageDeployment,
    ]);

    args.filters = args.filters || [];

    // By default, only return deployments with sync offset (target_state different from actual_state)
    const hasStateFilter = args.filters?.some(
      (filter) =>
        filter?.key === DeploymentRequestFilterKey.TargetState ||
        filter?.key === DeploymentRequestFilterKey.ActualState
    );

    return DeploymentRequestDomain.loadDeploymentRequests<PlatformDeploymentRequestConnection>(
      {
        ...args,
        orderBy: DeploymentRequestOrdering.Ordering,
        orderMode: OrderingMode.Asc,
      },
      {
        onlyOutOfSync: !hasStateFilter,
      }
    );
  },

  loadAvailableDeploymentRequests: async (
    platformIdentifier: PlatformIdentifier | null
  ): Promise<DeploymentAvailability[]> => {
    const quotas = await DeploymentQuotaDomain.loadQuotas(
      platformIdentifier
        ? { platform_identifier: platformIdentifier }
        : { type: DeploymentRequestDeploymentType.Bundle }
    );

    return quotas.map((quota) => ({
      id: quota.id,
      region: quota.region,
      availableCount: quota.availability,
      capacity: quota.capacity,
      platform_identifier: platformIdentifier,
    }));
  },

  reorderDeploymentRequestInQueue: async ({
    id,
    direction,
  }: {
    id: DeploymentRequestId;
    direction: ReorderDeploymentRequestInQueueDirection;
  }): Promise<Success> => {
    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({ id });
    if (!deploymentRequest) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }

    if (DeploymentRequestHubStatus.Queued !== deploymentRequest.hub_status) {
      throw new Error(ErrorCode.DeploymentRequestHubStatusNotQueued);
    }

    switch (direction) {
      case ReorderDeploymentRequestInQueueDirection.Top:
        await DeploymentRequestDomain.reorderDeploymentRequestToTop(
          deploymentRequest
        );
        break;

      case ReorderDeploymentRequestInQueueDirection.Up:
        await DeploymentRequestDomain.reorderDeploymentRequestUp(
          deploymentRequest
        );
        break;
    }

    return {
      success: true,
    };
  },

  updateDeploymentQuotaCapacity: async ({
    platformIdentifier,
    region,
    newCapacity,
  }: {
    platformIdentifier?: PlatformIdentifier | null;
    region: DeploymentRequestPlatformRegion;
    newCapacity: number;
  }): Promise<{ success: boolean }> => {
    const user = requestContext.requireUser();

    await DeploymentQuotaApp.applyQuotaCapacityChange({
      platformIdentifier,
      region,
      newCapacity,
      onRequestMoved: (movedRequest) =>
        DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
          movedRequest,
          user.id
        ),
    });

    return { success: true };
  },

  cancelDeploymentRequest: async (
    deploymentRequestId: DeploymentRequestId,
    isAdmin: boolean,
    cancellationReason?: string
  ): Promise<DeploymentRequest> => {
    const user = requestContext.requireUser();
    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        id: deploymentRequestId,
      });

    if (!deploymentRequest) {
      throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
    }

    if (isBundleChild(deploymentRequest)) {
      throw new Error(ForbiddenErrorCode.CantCancelBundleProduct);
    }

    if (
      !isAdmin &&
      user.selected_organization_id !==
        deploymentRequest.organization_requester_id
    ) {
      throw new Error(ForbiddenErrorCode.UserIsNotInOrganization);
    }

    const family =
      await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
        deploymentRequest
      );

    const updatedFamily = await withTransaction(async () => {
      const updated: DeploymentRequestModel[] = [];

      for (const request of family) {
        const updatedRequest =
          await DeploymentCancellationApp.applyCancellationToDeploymentRequest({
            deploymentRequest: request,
            userId: user.id,
            isAdmin,
            cancellationReason,
          });
        updated.push(updatedRequest);

        await sendDeploymentRequestCancelledNotifications(
          updatedRequest,
          user.id
        );
      }

      return updated;
    });

    for (const previousRequest of family) {
      if (shouldDeleteDeploymentRequestAudience(previousRequest)) {
        await DeploymentRequestDomain.deleteDeploymentRequestAudience(
          previousRequest
        );
      }
    }

    const [updatedDeploymentRequest] = updatedFamily;
    if (!updatedDeploymentRequest) {
      throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
    }

    return updatedDeploymentRequest;
  },

  expireTrials: async () => {
    const expiredTrials: DeploymentRequestModel[] =
      await DeploymentRequestDomain.loadTrialsToExpire();

    for (const trial of expiredTrials) {
      logApp.info('expiring trial', { deploymentRequestId: trial.id });

      const family =
        await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
          trial,
          DeploymentRequestHubStatus.Active
        );

      try {
        await withTransaction(async () => {
          for (const request of family) {
            const updatedRequest =
              await applyExpirationToDeploymentRequest(request);

            await sendDeploymentRequestExpiredNotifications(updatedRequest);
          }
        });
      } catch (error) {
        logApp.error('Error during trial expiration', {
          error,
          deploymentRequestId: trial.id,
        });
        continue;
      }

      for (const request of family) {
        if (shouldDeleteDeploymentRequestAudience(request)) {
          await DeploymentRequestDomain.deleteDeploymentRequestAudience(
            request
          );
        }
      }
    }
  },

  loadTrialDeployments: async (input: TrialDeploymentsInput) => {
    const user = requestContext.requireUser();
    await securityGuard.assertUserIsInOrganization(user, input.organizationId);

    const organization = await OrganizationDomain.loadOrganizationBy({
      id: input.organizationId,
    });
    if (!organization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    if (organization.personal_space) {
      return {
        availableTrials: [],
        deployed: [],
        isBlacklisted: false,
      };
    }

    const deploymentRequests =
      await DeploymentRequestDomain.loadTrialsForOrganization(
        user.selected_organization_id,
        input.platformIdentifiers ?? undefined
      );

    const deployedIdentifiers = new Set(
      deploymentRequests.map((d) => d.platform_identifier)
    );

    const requestedIdentifiers =
      input.platformIdentifiers ?? REGISTRABLE_PLATFORM_IDENTIFIERS;
    const availableTrials = requestedIdentifiers.filter(
      (identifier) => !deployedIdentifiers.has(identifier)
    );

    return {
      availableTrials: availableTrials,
      deployed: deploymentRequests
        .filter(
          (
            deployment
          ): deployment is DeploymentRequestModel & {
            platform_identifier: PlatformIdentifier;
          } => deployment.platform_identifier !== null
        )
        .map((deployment) => {
          return {
            serviceInstanceId: deployment.service_instance_id,
            platformIdentifier: deployment.platform_identifier,
          };
        }),
      isBlacklisted:
        await CompetitorApp.isOrganizationBlacklisted(organization),
    };
  },
  loadPlatformTrialStatus: async (organizationId: OrganizationId) => {
    const user = requestContext.requireUser();
    await securityGuard.assertUserIsInOrganization(user, organizationId);

    const organization = await OrganizationDomain.loadOrganizationBy({
      id: organizationId,
    });
    if (!organization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    if (organization.personal_space) {
      return {
        ongoingStandaloneTrials: [],
        isBlacklisted: false,
        hub_status: null,
        end_date: null,
      };
    }

    const bundle =
      await DeploymentRequestDomain.loadBundleTrialForOrganization(
        organizationId
      );

    const standaloneTrials =
      await DeploymentRequestDomain.loadOngoingStandaloneTrialsForOrganization(
        organizationId
      );

    return {
      isBlacklisted:
        await CompetitorApp.isOrganizationBlacklisted(organization),
      hub_status: bundle?.hub_status ?? null,
      end_date: bundle?.end_date ?? null,
      ongoingStandaloneTrials: standaloneTrials
        .map(({ platform_identifier }) => platform_identifier)
        .filter(
          (identifier): identifier is PlatformIdentifier => identifier !== null
        ),
    };
  },

  loadXtmPlatformBundle: async (): Promise<DeploymentRequest | null> => {
    const user = requestContext.requireUser();
    const bundle = await DeploymentRequestDomain.loadFullDeploymentRequest(
      {
        type: DeploymentRequestDeploymentType.Bundle,
        organization_requester_id: user.selected_organization_id,
        counts_in_orga_quota: true,
      },
      { orderBy: { column: 'request_date', order: OrderingMode.Desc } }
    );

    return bundle ?? null;
  },

  loadXtmonePlatformIntegrationStatus: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<XtmoneIntegrationStatus | null> => {
    const user = requestContext.requireUser();
    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        service_instance_id: serviceInstanceId,
        organization_requester_id: user.selected_organization_id,
      });
    if (!deploymentRequest) {
      return null;
    }

    const [configuration] =
      await RegistrationDomain.loadRegisteredPlatform(serviceInstanceId);
    const baseUrl =
      configuration?.platform_url ?? deploymentRequest.url ?? null;
    if (!baseUrl) {
      return null;
    }

    return fetchXtmoneIntegrationStatus(baseUrl);
  },
};

type ValidatedDeploymentRequestProducts =
  | {
      type: DeploymentRequestDeploymentType.Bundle;
      products: PlatformIdentifier[];
    }
  | {
      type: DeploymentRequestDeploymentType.Trial;
      platformIdentifier: PlatformIdentifier;
    };

const validateDeploymentRequestProducts = (
  input: CreateDeploymentRequestInput
): ValidatedDeploymentRequestProducts => {
  const uniqueProducts = [...new Set(input.products)];

  if (input.type === DeploymentRequestDeploymentType.Bundle) {
    const includesXtmone = uniqueProducts.includes(PlatformIdentifier.Xtmone);
    const hasAtLeastOneOtherProduct = uniqueProducts.length >= 2;
    if (!includesXtmone || !hasAtLeastOneOtherProduct) {
      throw new Error(BadRequestErrorCode.InvalidProductsForDeploymentType);
    }
    DeploymentHelper.validateUseCasesByProduct(input, uniqueProducts);
    return {
      type: DeploymentRequestDeploymentType.Bundle,
      products: uniqueProducts,
    };
  }

  const [platformIdentifier] = input.products;
  const hasSingleProduct = input.products.length === 1 && !!platformIdentifier;
  const isXtmone = platformIdentifier === PlatformIdentifier.Xtmone;
  if (!hasSingleProduct || isXtmone) {
    throw new Error(BadRequestErrorCode.InvalidProductsForDeploymentType);
  }
  DeploymentHelper.validateUseCasesByProduct(input, uniqueProducts);
  return { type: DeploymentRequestDeploymentType.Trial, platformIdentifier };
};

const createSingleDeploymentRequest = async ({
  user,
  input,
  platformIdentifier,
  type,
  parentId,
  inheritedHubStatus,
}: {
  user: UserLoadUserBy;
  input: CreateDeploymentRequestInput;
  platformIdentifier: PlatformIdentifier;
  type: DeploymentRequestDeploymentType;
  parentId: DeploymentRequestId | null;
  inheritedHubStatus?: DeploymentRequestHubStatus;
}): Promise<DeploymentRequestModel> => {
  const serviceDefinition =
    await ServiceDefinitionDomain.loadServiceDefinitionByPlatformIdentifier(
      platformIdentifier
    );
  if (!serviceDefinition) {
    throw new Error(ErrorCode.ServiceDefinitionNotFound);
  }

  const quotaKeys =
    parentId === null
      ? [
          bundleQuotaKey(input.region),
          trialQuotaKey(platformIdentifier, input.region),
        ]
      : [];

  return DeploymentQuotaDomain.withLockedQuotaTransaction(
    quotaKeys,
    async () => {
      const hubStatus = await resolveHubStatus({
        parentId,
        inheritedHubStatus,
        platformIdentifier,
        region: input.region,
      });
      const maxOrdering = await DeploymentRequestDomain.getMaxOrderingInQueue(
        {
          type,
          platformIdentifier,
          region: input.region,
        },
        hubStatus
      );
      const ordering = (maxOrdering ?? 0) + 1;

      const serviceInstanceId = await RegistrationDomain.registerNewPlatform({
        serviceDefinitionId: serviceDefinition.id,
        organizationId: user.selected_organization_id,
        platformIdentifier,
        serviceInstanceCreationStatus: ServiceInstanceCreationStatus.Pending,
      });

      return DeploymentRequestDomain.insertDeploymentRequest({
        id: uuidv4() as DeploymentRequestId,
        user_requester_id: user.id,
        organization_requester_id: user.selected_organization_id,
        service_instance_id: serviceInstanceId,
        hub_status: hubStatus,
        target_state:
          hubStatus === DeploymentRequestHubStatus.Queued
            ? DeploymentRequestPlatformState.Unprovisioned
            : DeploymentRequestPlatformState.Active,
        actual_state: DeploymentRequestPlatformState.Unprovisioned,
        ordering,
        type,
        platform_identifier: platformIdentifier,
        region: input.region,
        job_title: input.job_title,
        use_case:
          input.use_cases_by_product?.find(
            (entry) => entry.platform_identifier === platformIdentifier
          )?.use_case ?? null,
        activity_sector: input.activity_sector,
        platform_token: uuidv4(),
        source: input.source,
        parent_id: parentId,
      });
    }
  );
};

const resolveHubStatus = async ({
  parentId,
  inheritedHubStatus,
  platformIdentifier,
  region,
}: {
  parentId: DeploymentRequestId | null;
  inheritedHubStatus?: DeploymentRequestHubStatus;
  platformIdentifier: PlatformIdentifier;
  region: DeploymentRequestPlatformRegion;
}): Promise<DeploymentRequestHubStatus> => {
  if (parentId !== null) {
    return inheritedHubStatus ?? DeploymentRequestHubStatus.Pending;
  }

  const { isPlaceAvailable } = await DeploymentQuotaApp.takeQuotaForRequest({
    type: DeploymentRequestDeploymentType.Trial,
    region,
    platformIdentifier,
    parentId,
  });

  return isPlaceAvailable
    ? DeploymentRequestHubStatus.Pending
    : DeploymentRequestHubStatus.Queued;
};

type TrialMailContext =
  | { isBundle: false; platformIdentifier: PlatformIdentifier }
  | ({ isBundle: true } & Omit<FreeTrialBundleModel, 'firstName'>);

const buildTrialMailContext = async (
  deploymentRequest: DeploymentRequestModel
): Promise<TrialMailContext | null> => {
  if (isBundleChild(deploymentRequest)) {
    return null;
  }

  if (deploymentRequest.type !== DeploymentRequestDeploymentType.Bundle) {
    return deploymentRequest.platform_identifier
      ? {
          isBundle: false,
          platformIdentifier: deploymentRequest.platform_identifier,
        }
      : null;
  }

  const [, ...children] =
    await DeploymentRequestDomain.loadDeploymentRequestWithChildren(
      deploymentRequest
    );
  const products = children.flatMap((child) => child.platform_identifier ?? []);

  return {
    isBundle: true,
    productNames: formatProductNames(products),
    products,
  };
};

const sendStatusPlatformEmail = async (
  deploymentRequest: DeploymentRequestModel,
  hubStatus: DeploymentRequestHubStatus
): Promise<void> => {
  if (hubStatus === DeploymentRequestHubStatus.Provisioning) {
    await sendProvisioningPlatformEmail(deploymentRequest);
  }
  if (hubStatus === DeploymentRequestHubStatus.Active) {
    await sendActivePlatformEmail(deploymentRequest);
  }
};

const sendDeploymentRequestCreatedMail = async ({
  user,
  deploymentRequest,
}: {
  user: UserLoadUserBy;
  deploymentRequest: DeploymentRequestModel;
}): Promise<void> => {
  try {
    const mailContext = await buildTrialMailContext(deploymentRequest);

    if (!mailContext) {
      return;
    }

    const firstName = formatName(user.first_name ?? '');

    if (mailContext.isBundle) {
      await sendMail({
        to: user.email,
        template: 'free_trial_bundle_requested',
        params: {
          firstName,
          productNames: mailContext.productNames,
          products: mailContext.products,
        },
      });
      return;
    }

    await sendMail({
      to: user.email,
      template:
        deploymentRequest.hub_status === DeploymentRequestHubStatus.Pending
          ? 'free_trial_requested'
          : 'free_trial_queued',
      params: {
        firstName,
        platformIdentifier: mailContext.platformIdentifier,
      },
    });
  } catch (error) {
    logApp.error('Unable to send mail', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};

const sendDeploymentRequestCreatedNotifications = async ({
  user,
  chosenOrganization,
  input,
  platformIdentifier,
  deploymentRequest,
}: {
  user: UserLoadUserBy;
  chosenOrganization: Organization;
  input: CreateDeploymentRequestInput;
  platformIdentifier: PlatformIdentifier;
  deploymentRequest: DeploymentRequestModel;
}): Promise<void> => {
  try {
    const createDeploymentEvent = TelemetryHelper.buildCreateDeploymentEvent(
      chosenOrganization,
      user.id,
      platformIdentifier,
      input.source,
      {
        region: deploymentRequest.region,
        status: deploymentRequest.hub_status,
        activity_sector: deploymentRequest.activity_sector,
        job_title: deploymentRequest.job_title,
        use_case: deploymentRequest.use_case,
        email: user.email,
        deployment_id: deploymentRequest.id,
        deployment_type: deploymentRequest.type,
        parent_id: deploymentRequest.parent_id ?? undefined,
      }
    );
    await TelemetryApp.sendTelemetryEvent(createDeploymentEvent);
  } catch (error) {
    logApp.error('Unable to send telemetry event', {
      error,
    });
  }

  await sendDeploymentRequestCreatedMail({ user, deploymentRequest });

  const instanceRequestedEmail =
    portalConfig.environment === 'production'
      ? XTM_HUB_SUPPORT_EMAIL
      : XTM_HUB_DEV_TEAM_EMAIL;
  try {
    await sendMail({
      to: instanceRequestedEmail,
      template: 'admin_saas_instance_requested',
      params: {
        organizationName: chosenOrganization.name,
        userName:
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : `${user.email}`,
        userEmail: user.email,
        region: input.region,
        activitySector: input.activity_sector ?? undefined,
        useCase: deploymentRequest.use_case ?? undefined,
        platformIdentifier,
        deploymentType: ucfirst(deploymentRequest.type),
      },
    });
  } catch (error) {
    logApp.error('Unable to send mail to admins', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};

const createBundleDeploymentRequest = async ({
  user,
  chosenOrganization,
  input,
  products,
}: {
  user: UserLoadUserBy;
  chosenOrganization: Organization;
  input: CreateDeploymentRequestInput;
  products: PlatformIdentifier[];
}): Promise<DeploymentRequestModel> => {
  const bundleServiceDefinition =
    await ServiceDefinitionDomain.loadServiceDefinitionBy({
      identifier: ServiceDefinitionIdentifier.XtmPlatformBundle,
    });
  if (!bundleServiceDefinition) {
    throw new Error(ErrorCode.ServiceDefinitionNotFound);
  }

  for (const platformIdentifier of products) {
    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByPlatformIdentifier(
        platformIdentifier
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }
  }

  return DeploymentQuotaDomain.withLockedQuotaTransaction(
    [
      bundleQuotaKey(input.region),
      ...products.map((platformIdentifier) =>
        trialQuotaKey(platformIdentifier, input.region)
      ),
    ],
    async () => {
      const { isPlaceAvailable } = await DeploymentQuotaApp.takeQuotaForRequest(
        {
          type: DeploymentRequestDeploymentType.Bundle,
          region: input.region,
          products,
        }
      );
      const bundleHubStatus = isPlaceAvailable
        ? DeploymentRequestHubStatus.Pending
        : DeploymentRequestHubStatus.Queued;

      const bundleServiceInstance =
        await ServiceInstanceDomain.insertServiceInstance({
          id: uuidv4() as ServiceInstanceId,
          name: XTM_PLATFORM_BUNDLE_SERVICE_INSTANCE_NAME,
          description: '',
          public: false,
          creation_status: ServiceInstanceCreationStatus.Pending,
          tags: [
            ServiceInstanceTag.Trial,
            ...products.map(
              (platformIdentifier) =>
                serviceInstanceTagMappedByPlatformIdentifier[platformIdentifier]
            ),
          ],
          service_definition_id: bundleServiceDefinition.id,
        });

      await SubscriptionDomain.createSubscription({
        id: uuidv4() as SubscriptionId,
        organization_id: user.selected_organization_id,
        service_instance_id: bundleServiceInstance.id,
        start_date: new Date(),
        end_date: null,
      });

      const maxOrdering = await DeploymentRequestDomain.getMaxOrderingInQueue(
        {
          type: DeploymentRequestDeploymentType.Bundle,
          platformIdentifier: null,
          region: input.region,
        },
        bundleHubStatus
      );

      const bundleDeploymentRequest =
        await DeploymentRequestDomain.insertDeploymentRequest({
          id: uuidv4() as DeploymentRequestId,
          user_requester_id: user.id,
          organization_requester_id: user.selected_organization_id,
          service_instance_id: bundleServiceInstance.id,
          hub_status: bundleHubStatus,
          target_state:
            bundleHubStatus === DeploymentRequestHubStatus.Queued
              ? DeploymentRequestPlatformState.Unprovisioned
              : DeploymentRequestPlatformState.Active,
          actual_state: DeploymentRequestPlatformState.Unprovisioned,
          ordering: (maxOrdering ?? 0) + 1,
          type: DeploymentRequestDeploymentType.Bundle,
          platform_identifier: null,
          region: input.region,
          job_title: input.job_title,
          use_case: null,
          activity_sector: input.activity_sector,
          platform_token: uuidv4(),
          source: input.source,
          parent_id: null,
        });

      if (isPlaceAvailable) {
        await DeploymentCancellationApp.cancelOngoingStandaloneTrialsForBundle(
          bundleDeploymentRequest
        );
      }

      try {
        const createDeploymentEvent =
          TelemetryHelper.buildCreateDeploymentEvent(
            chosenOrganization,
            user.id,
            undefined,
            input.source,
            {
              region: bundleDeploymentRequest.region,
              status: bundleDeploymentRequest.hub_status,
              activity_sector: bundleDeploymentRequest.activity_sector,
              job_title: bundleDeploymentRequest.job_title,
              use_case: bundleDeploymentRequest.use_case,
              email: user.email,
              deployment_id: bundleDeploymentRequest.id,
              deployment_type: bundleDeploymentRequest.type,
            }
          );
        await TelemetryApp.sendTelemetryEvent(createDeploymentEvent);
      } catch (error) {
        logApp.error('Unable to send telemetry event', {
          error,
        });
      }

      for (const platformIdentifier of products) {
        const childDeploymentRequest = await createSingleDeploymentRequest({
          user,
          input,
          platformIdentifier,
          type: DeploymentRequestDeploymentType.Trial,
          parentId: bundleDeploymentRequest.id,
          inheritedHubStatus: bundleHubStatus,
        });

        await sendDeploymentRequestCreatedNotifications({
          user,
          chosenOrganization,
          input,
          platformIdentifier,
          deploymentRequest: childDeploymentRequest,
        });
      }

      await sendDeploymentRequestCreatedMail({
        user,
        deploymentRequest: bundleDeploymentRequest,
      });

      return bundleDeploymentRequest;
    }
  );
};

const loadDeploymentRequestForUpdate = async (
  deploymentRequestId: DeploymentRequestId
) => {
  const deploymentRequest =
    await DeploymentRequestDomain.loadDeploymentRequestBy({
      id: deploymentRequestId,
    });

  if (!deploymentRequest) {
    logApp.error(`Deployment request not found with id ${deploymentRequestId}`);
    throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
  }

  return deploymentRequest;
};

const sendDeploymentRequestCancelledNotifications = async (
  deploymentRequest: DeploymentRequestModel,
  userId: UserId
): Promise<void> => {
  await DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
    deploymentRequest,
    userId
  );

  try {
    const [requester] = await UserDomain.loadUser({
      id: deploymentRequest.user_requester_id,
    });
    const mailContext = await buildTrialMailContext(deploymentRequest);

    if (requester && mailContext) {
      const firstName = formatName(requester.first_name ?? '');

      await (mailContext.isBundle
        ? sendMail({
            to: requester.email,
            template: 'free_trial_bundle_cancelled',
            params: {
              firstName,
              productNames: mailContext.productNames,
              products: mailContext.products,
            },
          })
        : sendMail({
            to: requester.email,
            template: 'free_trial_cancelled',
            params: {
              firstName,
              platformIdentifier: mailContext.platformIdentifier,
            },
          }));
    } else if (!requester) {
      logApp.warn('Requester not found for trial cancellation mail', {
        deploymentRequestId: deploymentRequest.id,
      });
    }
  } catch (error) {
    logApp.error('Unable to send mail for trial cancellation', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};

const applyExpirationToDeploymentRequest = async (
  deploymentRequest: DeploymentRequestModel
): Promise<DeploymentRequestModel> => {
  const previousHubStatus = deploymentRequest.hub_status;

  return DeploymentQuotaDomain.withLockedQuotaTransaction(
    quotaKeysOfRequest(deploymentRequest),
    async () => {
      const updatedDeploymentRequest =
        await DeploymentRequestDomain.updateDeploymentRequestById(
          deploymentRequest.id,
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            target_state: DeploymentRequestPlatformState.Removed,
          }
        );

      if (!updatedDeploymentRequest) {
        throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
      }

      await DeploymentCancellationApp.releaseDeploymentRequestPlace(
        previousHubStatus,
        deploymentRequest
      );

      return updatedDeploymentRequest;
    }
  );
};

const sendDeploymentRequestExpiredNotifications = async (
  deploymentRequest: DeploymentRequestModel
): Promise<void> => {
  await DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
    deploymentRequest,
    SYSTEM_USER_UUID
  );

  try {
    const [requester] = await UserDomain.loadUser({
      id: deploymentRequest.user_requester_id,
    });
    const mailContext = await buildTrialMailContext(deploymentRequest);

    if (requester && mailContext) {
      const firstName = formatName(requester.first_name ?? '');

      await (mailContext.isBundle
        ? sendMail({
            to: requester.email,
            template: 'free_trial_bundle_expired',
            params: {
              firstName,
              productNames: mailContext.productNames,
              products: mailContext.products,
            },
          })
        : sendMail({
            to: requester.email,
            template: 'free_trial_expired',
            params: {
              firstName,
              platformIdentifier: mailContext.platformIdentifier,
            },
          }));
    } else if (!requester) {
      logApp.warn('Requester not found for trial expiration mail', {
        trialId: deploymentRequest.id,
      });
    }
  } catch (error) {
    logApp.error('Unable to send mail for trial expiration', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};

const checkStatusAndDataValidity = async (
  deploymentRequest: DeploymentRequestModel,
  input: UpdateDeploymentRequestInput
) => {
  if (
    input.actual_state &&
    !DeploymentHelper.isPlatformStateTransitionValid(
      deploymentRequest.actual_state,
      input.actual_state
    )
  ) {
    logApp.error(
      `Invalid deployment request status update from ${deploymentRequest.actual_state} to ${input.actual_state}`
    );
    throw new Error(
      BadRequestErrorCode.DeploymentRequestStatusUpdateNotAllowed
    );
  }

  // Bundle dates are not carried by the input: they are recomputed from
  // children (see computeBundleDates), so this check does not apply to bundles.
  const isBundle =
    deploymentRequest.type === DeploymentRequestDeploymentType.Bundle;
  const isActiveInputDataInvalid =
    !isBundle &&
    input.actual_state == DeploymentRequestPlatformState.Active &&
    (!input.start_date || !input.end_date);
  if (isActiveInputDataInvalid) {
    logApp.error(
      `Missing start or end date for active deployment request with id ${deploymentRequest.id}`
    );
    throw new Error(BadRequestErrorCode.MissingStartOrEndDate);
  }
};

const resolveNextHubStatus = (
  deploymentRequest: DeploymentRequestModel,
  actualState: UpdateDeploymentRequestInput['actual_state']
) => {
  const computedStatus = DeploymentHelper.computeHubStatus(
    deploymentRequest.hub_status,
    actualState
  );

  // If hub status cannot be computed, keep previous status and log for investigation.
  if (!computedStatus) {
    logApp.error('Invalid deployment request hub status update', {
      deploymentRequest: deploymentRequest.id,
      new_hub_status: computedStatus,
      previous_hub_status: deploymentRequest.hub_status,
      actual_state: actualState,
    });
    return deploymentRequest.hub_status;
  }

  return computedStatus;
};

const syncPlatformRegistrationStatus = async (
  deploymentRequest: DeploymentRequestModel,
  actualState: UpdateDeploymentRequestInput['actual_state']
) => {
  if (actualState !== DeploymentRequestPlatformState.Removed) {
    return;
  }

  await PlatformConfigurationDomain.updateConfiguration(
    deploymentRequest.service_instance_id,
    { status: PlatformConfigurationStatus.Inactive }
  );
};

const recomputeBundleDates = async (bundleId: DeploymentRequestId) => {
  const bundle = await DeploymentRequestDomain.loadDeploymentRequestBy({
    id: bundleId,
  });
  if (!bundle) {
    throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
  }

  if (
    [
      DeploymentRequestHubStatus.Cancelled,
      DeploymentRequestHubStatus.Expired,
    ].includes(bundle.hub_status)
  ) {
    return;
  }

  const children = await DeploymentRequestDomain.loadDeploymentRequestsBy({
    parent_id: bundleId,
  });

  const updatedBundle =
    await DeploymentRequestDomain.updateDeploymentRequestById(bundleId, {
      ...DeploymentHelper.computeBundleDates(children),
    });
  if (!updatedBundle) {
    throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
  }

  await DeploymentCancellationApp.sendUpdateDeploymentTelemetryEvent(
    updatedBundle,
    updatedBundle.user_requester_id,
    bundle
  );
};

const applyDeploymentRequestUpdateInQuotaTransaction = async ({
  deploymentRequest,
  deploymentRequestId,
  input,
  newStatus,
}: {
  deploymentRequest: DeploymentRequestModel;
  deploymentRequestId: DeploymentRequestId;
  input: UpdateDeploymentRequestInput;
  newStatus: DeploymentRequestHubStatus;
}) => {
  await DeploymentQuotaDomain.withLockedQuotaTransaction(
    quotaKeysOfRequest(deploymentRequest),
    async () => {
      if (deploymentRequest.type === DeploymentRequestDeploymentType.Bundle) {
        await DeploymentRequestDomain.updateDeploymentRequestById(
          deploymentRequestId,
          {
            platform_id: input.platform_id,
            failure_reason: input.failure_reason,
            actual_state: input.actual_state,
            hub_status: newStatus,
          }
        );

        return;
      }

      const shouldUpdateSubscriptionDates = input.start_date || input.end_date;
      if (shouldUpdateSubscriptionDates) {
        await SubscriptionDomain.updateSubscriptionBy(
          { service_instance_id: deploymentRequest.service_instance_id },
          {
            start_date: input.start_date,
            end_date: input.end_date,
          }
        );
      }

      const updateData: DeploymentRequestMutator = {
        start_date: input.start_date,
        end_date: input.end_date,
        platform_id: input.platform_id,
        failure_reason: input.failure_reason,
        actual_state: input.actual_state,
        ordering: input.ordering ?? undefined,
        hub_status: newStatus,
        url: input.url,
      };

      await DeploymentRequestDomain.updateDeploymentRequestById(
        deploymentRequestId,
        updateData
      );
      await syncPlatformRegistrationStatus(
        deploymentRequest,
        input.actual_state
      );

      if (newStatus === DeploymentRequestHubStatus.Active) {
        await DeploymentRequestDomain.initialiseServiceGroup(
          deploymentRequestId,
          deploymentRequest.platform_identifier
        );
      }
    }
  );
};

const sendProvisioningPlatformEmail = async (
  deploymentRequest: DeploymentRequestModel
) => {
  try {
    const mailContext = await buildTrialMailContext(deploymentRequest);

    if (!mailContext) {
      return;
    }

    const [user] = await UserDomain.loadUser({
      id: deploymentRequest.user_requester_id,
    });
    if (user) {
      const firstName = formatName(user.first_name ?? '');

      await (mailContext.isBundle
        ? sendMail({
            to: user.email,
            template: 'free_trial_bundle_provisioning',
            params: {
              firstName,
              productNames: mailContext.productNames,
              products: mailContext.products,
            },
          })
        : sendMail({
            to: user.email,
            template: 'free_trial_provisioning',
            params: {
              firstName,
              platformIdentifier: mailContext.platformIdentifier,
            },
          }));
    } else {
      logApp.warn('Requester not found for provisioning platform mail', {
        deploymentRequestId: deploymentRequest.id,
      });
    }
  } catch (error) {
    logApp.error('Unable to send mail', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};

const resolveActivePlatformUrl = async (
  deploymentRequest: DeploymentRequestModel,
  isBundle: boolean
): Promise<string | null> => {
  if (isBundle) {
    return buildXtmPlatformTrialLink();
  }

  if (!deploymentRequest.platform_id) {
    logApp.error('Unable to send mail after deployment request is active', {
      error: 'platform_id not set for active platform',
      deploymentRequestId: deploymentRequest.id,
    });
    return null;
  }

  const platformConfiguration =
    await PlatformConfigurationDomain.loadConfigurationByPlatform(
      deploymentRequest.platform_id
    );

  if (!platformConfiguration) {
    logApp.error('Unable to send mail after deployment request is active', {
      error: NotFoundErrorCode.PlatformConfigurationNotFound,
      deploymentRequestId: deploymentRequest.id,
      platformId: deploymentRequest.platform_id,
    });
    return null;
  }

  return platformConfiguration.platform_url;
};

const sendActivePlatformEmail = async (
  deploymentRequest: DeploymentRequestModel
) => {
  try {
    const mailContext = await buildTrialMailContext(deploymentRequest);

    if (!mailContext) {
      return;
    }

    const platformUrl = await resolveActivePlatformUrl(
      deploymentRequest,
      mailContext.isBundle
    );

    if (!platformUrl) {
      return;
    }

    const [user] = await UserDomain.loadUser({
      id: deploymentRequest.user_requester_id,
    });

    if (!user) {
      logApp.error('Unable to send mail after deployment request is active', {
        error: 'Requester not found',
        deploymentRequestId: deploymentRequest.id,
      });
      return;
    }

    const firstName = formatName(user.first_name ?? '');

    await (mailContext.isBundle
      ? sendMail({
          to: user.email,
          template: 'free_trial_bundle_active',
          params: {
            firstName,
            platformUrl,
            productNames: mailContext.productNames,
            products: mailContext.products,
          },
        })
      : sendMail({
          to: user.email,
          template: 'free_trial_registered',
          params: {
            firstName,
            platformUrl,
            platformIdentifier: mailContext.platformIdentifier,
            globalServiceInstanceId: toGlobalId(
              'ServiceInstance',
              deploymentRequest.service_instance_id
            ),
          },
        }));
  } catch (error) {
    logApp.error('Unable to send mail after deployment request is active', {
      error,
      deploymentRequestId: deploymentRequest.id,
    });
  }
};
