import { v4 as uuidv4 } from 'uuid';
import {
  AutoRegisterPlatformInput,
  CanUnregisterPlatformInput,
  DeploymentRequestHubStatus,
  IsPlatformRegisteredInput,
  IsPlatformRegisteredResponse,
  OpenCtiPlatformRegistrationStatusInput,
  OrganizationCapability,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformInput,
  PlatformRegistrationConnectivityStatus,
  PlatformRegistrationStatus,
  RefreshUserPlatformTokenResponse,
  RegisteredPlatform,
  RegisteredPlatformsInput,
  RegisterPlatformInput,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
  UnregisterPlatformInput,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { requestContext } from '../../context/request.context';
import DeploymentRequest from '../../model/kanel/public/DeploymentRequest';
import Organization, {
  OrganizationId,
} from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import { securityGuard } from '../../security/guard';
import { sendMail } from '../../server/mail-service';
import { logApp } from '../../utils/app-logger.util';
import {
  BadRequestErrorCode,
  ErrorCode,
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../utils/error/error.code';
import { formatName } from '../../utils/format';
import { isValidVersion } from '../../utils/versioning';
import { DeploymentRequestDomain } from '../deployment/deployment.domain';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { UserOrganizationDomain } from '../organization-management/user/user-organization/user-organization.domain';
import { AuthHelper } from '../security-management/capability/auth.helper';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import {
  DomainRegisteredPlatform,
  PlatformConfigurationInput,
  RegistrationDomain,
} from './registration.domain';
import { RegistrationHelper } from './registration.helper';

const buildPlatformConfiguration = (
  platform: PlatformInput,
  registererId: UserId,
  token: string
): PlatformConfigurationInput => ({
  registerer_id: registererId,
  platform_id: platform.id,
  ...(platform.tenantId ? { tenant_id: platform.tenantId } : {}),
  ...(platform.tenantName ? { tenant_name: platform.tenantName } : {}),
  platform_url: platform.url,
  platform_title: platform.title,
  platform_contract: platform.contract,
  platform_version: platform.version ?? undefined,
  last_connectivity_check: new Date(),
  token,
});

export const RegistrationApp = {
  loadPlatformAssociatedOrganization: async (
    platformId: string,
    tenantId?: string | null
  ): Promise<Organization | null> => {
    const user = requestContext.requireUser();
    const resolvedConfiguration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
        platformId,
        { tenantId }
      );
    if (!resolvedConfiguration) {
      return null;
    }

    if (!tenantId) {
      if (
        RegistrationHelper.isTenantIdRequired(
          resolvedConfiguration.platformIdentifier,
          resolvedConfiguration.platformConfiguration.platform_version
        )
      ) {
        throw new Error(BadRequestErrorCode.TenantIdMandatory);
      }
    }

    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id:
        resolvedConfiguration.platformConfiguration.service_instance_id,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }

    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        organization_id: subscription.organization_id,
        user_id: user.id,
      });

    if (!userOrganization) {
      throw new Error(ErrorCode.UserIsNotInOrganization);
    }

    const orga = await OrganizationDomain.loadOrganizationBy({
      id: subscription.organization_id,
    });
    return orga ?? null;
  },

  loadRegisteredPlatform: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<RegisteredPlatform | null> => {
    const [platform] =
      await RegistrationDomain.loadRegisteredPlatform(serviceInstanceId);

    return platform ? mapDomainRegisteredPlatformToGraphQL(platform) : null;
  },

  loadRegisteredPlatforms: async (
    input: RegisteredPlatformsInput
  ): Promise<RegisteredPlatform[]> => {
    const platforms = await RegistrationDomain.loadRegisteredPlatforms({
      platformIdentifier: input?.identifier ?? undefined,
      onlyActive: input?.onlyActive ?? false,
      onlyTrial: input?.onlyTrial ?? false,
      hasDeployedResources: input?.hasDeployedResources ?? false,
    });

    return platforms.map(mapDomainRegisteredPlatformToGraphQL);
  },

  /**
   * @deprecated This function is only used by openCTIPlatformRegistrationStatus, which is deprecated.
   * Be careful when using it.
   */
  loadPlatformRegistrationStatus: async (
    input: OpenCtiPlatformRegistrationStatusInput
  ): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
    const platformConfiguration =
      await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
        platform_id: input.platformId,
        token: input.token,
      });
    return {
      status:
        platformConfiguration?.status === PlatformConfigurationStatus.Active
          ? PlatformRegistrationConnectivityStatus.Active
          : PlatformRegistrationConnectivityStatus.Inactive,
    };
  },

  registerPlatform: async ({
    organizationId,
    platform,
    identifier,
  }: RegisterPlatformInput): Promise<string> => {
    const user = requestContext.requireUser();
    const token = uuidv4();

    if (platform.version && !isValidVersion(platform.version)) {
      throw new Error(BadRequestErrorCode.InvalidPlatformVersion);
    }

    if (
      RegistrationHelper.isTenantIdRequired(identifier, platform.version) &&
      !platform.tenantId
    ) {
      throw new Error(BadRequestErrorCode.TenantIdMandatory);
    }

    const configuration = buildPlatformConfiguration(platform, user.id, token);

    const serviceDefinition =
      await ServiceDefinitionDomain.loadServiceDefinitionByPlatformIdentifier(
        identifier
      );
    if (!serviceDefinition) {
      throw new Error(ErrorCode.ServiceDefinitionNotFound);
    }

    const isConfigurationValid =
      await PlatformConfigurationDomain.isPlatformConfigurationValid(
        configuration
      );
    if (!isConfigurationValid) {
      throw new Error(ErrorCode.InvalidPlatformConfiguration);
    }

    const platformConfiguration =
      await PlatformConfigurationDomain.loadConfigurationByPlatform(
        platform.id,
        {
          tenantId: platform.tenantId,
        }
      );

    const existingConfigTenantId = platformConfiguration?.tenant_id;
    if (existingConfigTenantId && !platform.tenantId) {
      throw new Error(BadRequestErrorCode.TenantIdMandatory);
    }

    await withTransaction(async () => {
      if (platformConfiguration) {
        await RegistrationDomain.refreshExistingPlatform({
          serviceInstanceId: platformConfiguration.service_instance_id,
          targetOrganizationId: organizationId as OrganizationId,
          configuration,
        });
      } else {
        await RegistrationDomain.registerNewPlatform({
          serviceDefinitionId: serviceDefinition.id,
          organizationId: organizationId as OrganizationId,
          configuration,
          platformIdentifier: identifier,
        });
      }
    });

    const users = await UserDomain.loadUsersByCapabilitiesInOrganization(
      organizationId,
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManagePlatformRegistration,
      ]
    );

    await Promise.all(
      users.map((user) =>
        sendMail({
          to: user.email,
          template: 'platform_registered',
          params: {
            adminName: formatName(user.first_name ?? ''),
            platformIdentifier: identifier,
          },
        })
      )
    );

    try {
      const selectedOrga = await OrganizationDomain.loadOrganizationBy({
        id: organizationId as OrganizationId,
      });
      if (!selectedOrga) {
        throw new Error(NotFoundErrorCode.OrganizationNotFound);
      }

      const registerEvent = TelemetryHelper.buildRegisterEvent(
        selectedOrga,
        user.id,
        identifier,
        platform.id,
        platform.contract,
        platform.version,
        platform.url,
        undefined,
        platform.tenantId ?? undefined
      );
      await TelemetryApp.sendTelemetryEvent(registerEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for registration', {
        error,
      });
    }

    return token;
  },

  unregisterPlatform: async ({
    platformId,
    identifier,
    tenantId,
  }: UnregisterPlatformInput) => {
    const resolvedConfiguration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
        platformId,
        {
          tenantId,
          status: PlatformConfigurationStatus.Active,
        }
      );
    if (!resolvedConfiguration) {
      return;
    }

    const { platformConfiguration } = resolvedConfiguration;
    if (platformConfiguration.tenant_id && !tenantId) {
      throw new Error(BadRequestErrorCode.TenantIdMandatory);
    }

    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id: platformConfiguration.service_instance_id,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }

    if (identifier !== resolvedConfiguration.platformIdentifier) {
      throw new Error(ErrorCode.InvalidPlatformIdentifier);
    }
    const user = requestContext.requireUser();
    await securityGuard.assertUserIsAllowedOnOrganization(user, {
      organizationId: subscription.organization_id,
      requiredCapability: OrganizationCapability.ManagePlatformRegistration,
    });

    await PlatformConfigurationDomain.updateConfiguration(
      platformConfiguration.service_instance_id,
      { status: PlatformConfigurationStatus.Inactive }
    );

    const users = await UserDomain.loadUsersByCapabilitiesInOrganization(
      subscription.organization_id,
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManagePlatformRegistration,
      ]
    );

    await Promise.all(
      users.map((user) =>
        sendMail({
          to: user.email,
          template: 'platform_unregistered',
          params: {
            adminName: formatName(user.first_name ?? ''),
            platformIdentifier: identifier,
          },
        })
      )
    );

    try {
      const selectedOrga = await OrganizationDomain.loadOrganizationBy({
        id: subscription.organization_id,
      });
      if (!selectedOrga) {
        throw new Error(NotFoundErrorCode.OrganizationNotFound);
      }

      const unregisterEvent = TelemetryHelper.buildUnregisterEvent(
        selectedOrga,
        user.id,
        identifier,
        platformConfiguration.platform_id,
        platformConfiguration.platform_contract,
        platformConfiguration.platform_version,
        platformConfiguration.platform_url,
        platformConfiguration.tenant_id ?? undefined
      );
      await TelemetryApp.sendTelemetryEvent(unregisterEvent);
    } catch (error) {
      logApp.error('Unable to send telemetry event for unregistration', {
        error,
      });
    }
  },

  isPlatformRegistered: async (
    input: IsPlatformRegisteredInput
  ): Promise<IsPlatformRegisteredResponse> => {
    const platformConfiguration =
      await PlatformConfigurationDomain.loadConfigurationByPlatform(
        input.platformId,
        { tenantId: input.tenantId }
      );
    if (!platformConfiguration) {
      return { status: PlatformRegistrationStatus.NeverRegistered };
    }

    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id: platformConfiguration.service_instance_id,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }

    return {
      status:
        platformConfiguration.status === PlatformConfigurationStatus.Active
          ? PlatformRegistrationStatus.Registered
          : PlatformRegistrationStatus.Unregistered,
      organization: { id: subscription.organization_id },
      platformTitle: platformConfiguration.platform_title,
    };
  },

  canUnregisterPlatform: async ({
    platformId,
    tenantId,
  }: CanUnregisterPlatformInput): Promise<{
    isAllowed: boolean;
    organizationId: OrganizationId | null;
    isInOrganization: boolean;
  }> => {
    const resolvedConfiguration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
        platformId,
        {
          tenantId,
          status: PlatformConfigurationStatus.Active,
        }
      );
    if (!resolvedConfiguration) {
      throw new Error(ErrorCode.PlatformNotRegistered);
    }

    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id:
        resolvedConfiguration.platformConfiguration.service_instance_id,
    });
    if (!subscription) {
      throw new Error(ErrorCode.PlatformNotRegistered);
    }

    const user = requestContext.requireUser();
    const { isAllowed, isInOrganization } =
      await AuthHelper.isUserAllowedOnOrganization(user, {
        organizationId: subscription.organization_id,
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

    return {
      isAllowed,
      isInOrganization,
      organizationId: subscription.organization_id,
    };
  },

  refreshUserPlatformToken: async (
    userId: UserId
  ): Promise<RefreshUserPlatformTokenResponse> => {
    const token = uuidv4();
    await UserDomain.updateUser(userId, { platform_token: token });

    return { token };
  },

  autoRegisterPlatform: async (
    token: string,
    input: AutoRegisterPlatformInput
  ) => {
    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        platform_token: token,
      });

    if (!deploymentRequest) {
      throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
    }

    assertValidDeploymentRequest(deploymentRequest, input.platform.id);

    if (!deploymentRequest.platform_identifier) {
      throw new Error(BadRequestErrorCode.InvalidPlatformIdentifier);
    }
    const platformIdentifier = deploymentRequest.platform_identifier;

    if (
      RegistrationHelper.isTenantIdRequired(
        platformIdentifier,
        input.platform.version
      ) &&
      !input.platform.tenantId
    ) {
      throw new Error(BadRequestErrorCode.TenantIdMandatory);
    }

    const configuration = buildPlatformConfiguration(
      input.platform,
      deploymentRequest.user_requester_id,
      deploymentRequest.platform_token
    );

    await withTransaction(async () => {
      await Promise.all([
        PlatformConfigurationDomain.upsertConfiguration(
          deploymentRequest.service_instance_id,
          configuration
        ),
        ServiceInstanceDomain.updateServiceInstance(
          deploymentRequest.service_instance_id,
          {
            creation_status: ServiceInstanceCreationStatus.Ready,
          }
        ),
      ]);

      try {
        const selectedOrga = await OrganizationDomain.loadOrganizationBy({
          id: deploymentRequest.organization_requester_id,
        });

        if (!selectedOrga) {
          throw new Error(NotFoundErrorCode.OrganizationNotFound);
        }
        const registerEvent = TelemetryHelper.buildRegisterEvent(
          selectedOrga,
          deploymentRequest.user_requester_id,
          platformIdentifier,
          input.platform.id,
          input.platform.contract,
          input.platform.version,
          input.platform.url,
          input.existing_users_count ?? undefined,
          input.platform.tenantId ?? undefined
        );
        await TelemetryApp.sendTelemetryEvent(registerEvent);
      } catch (error) {
        logApp.error('Unable to send telemetry event for registration', {
          error,
        });
      }
    });
  },
};

const mapDomainRegisteredPlatformToGraphQL = (
  platform: DomainRegisteredPlatform
): RegisteredPlatform => {
  const PLATFORM_TRIAL_TITLES: Partial<
    Record<ServiceDefinitionIdentifier, string>
  > = {
    [ServiceDefinitionIdentifier.OpenctiRegistration]:
      'OpenCTI - Free Trial Platform',
    [ServiceDefinitionIdentifier.OpenaevRegistration]:
      'OpenAEV - Free Trial Platform',
  };

  const defaultTitle =
    PLATFORM_TRIAL_TITLES[platform.identifier] ?? 'Free Trial Platform';
  return {
    __typename: 'RegisteredPlatform',
    id: platform.id,
    platform_id: platform.platform_id ?? platform.id,
    last_connectivity_check: platform?.last_connectivity_check ?? null,
    status: platform.status ?? null,
    tenant_id: platform.tenant_id,
    tenant_name: platform.tenant_name,
    title: platform.platform_title ?? defaultTitle,
    url: platform.platform_url ?? '',
    contract: platform.platform_contract ?? PlatformContract.Trial,
    identifier:
      platform.identifier ?? ServiceDefinitionIdentifier.OpenctiRegistration,
    version: platform.platform_version ?? '',
    illustration_document_id: platform.illustration_document_id ?? null,
  };
};

const assertValidDeploymentRequest = (
  deploymentRequest: DeploymentRequest,
  platformId: string
) => {
  if (!deploymentRequest) {
    throw new Error(NotFoundErrorCode.DeploymentRequestNotFound);
  }
  if (
    deploymentRequest.platform_id &&
    deploymentRequest.platform_id !== platformId
  ) {
    throw new Error(BadRequestErrorCode.InvalidPlatformId);
  }
  if (
    ![
      DeploymentRequestHubStatus.Active,
      DeploymentRequestHubStatus.Pending,
      DeploymentRequestHubStatus.Provisioning,
    ].includes(deploymentRequest.hub_status)
  ) {
    throw new Error(ForbiddenErrorCode.NotAllowedByDeploymentStatus);
  }
};
