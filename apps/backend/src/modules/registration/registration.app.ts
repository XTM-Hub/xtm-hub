import { validate as isUuid, v4 as uuidv4 } from 'uuid';
import { decodeOffsetCursor, encodeOffsetCursor } from '../../../knexfile';
import {
  AdminRegisteredPlatform,
  AdminRegisteredPlatformConnection,
  AdminRegisteredPlatformOrdering,
  AutoRegisterPlatformInput,
  CanUnregisterPlatformInput,
  IsPlatformRegisteredInput,
  IsPlatformRegisteredResponse,
  OpenCtiPlatformRegistrationStatusInput,
  OrderingMode,
  OrganizationCapability,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PlatformInput,
  PlatformRegistrationConnectivityStatus,
  PlatformRegistrationStatus,
  QueryAdminRegisteredPlatformsArgs,
  RefreshUserPlatformTokenResponse,
  RegisteredPlatform,
  RegisteredPlatformByPlatformIdInput,
  RegisteredPlatformCredentialKind,
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
import PlatformConfiguration, {
  PlatformConfigurationMutator,
} from '../../model/kanel/public/PlatformConfiguration';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import { securityGuard } from '../../security/guard';
import { PLATFORM_ACCEPTED_HUB_STATUSES } from '../../security/platform-credential';
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
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { AuthHelper } from '../security-management/capability/auth.helper';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { TelemetryApp } from '../telemetry/telemetry.app';
import { TelemetryHelper } from '../telemetry/telemetry.helper';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import {
  AdminRegisteredPlatformRow,
  DomainRegisteredPlatform,
  PlatformConfigurationInput,
  RegistrationDomain,
} from './registration.domain';
import { RegistrationHelper } from './registration.helper';
import { platformIdentifierMappedByServiceDefinitionIdentifier } from './registration.mapping';

// A platform registered before it used tenants keeps one tenant-less registration. OpenAEV gives it to its default
// tenant when it upgrades, so that tenant finds the tenant-less registration until it has its own. Any other tenant
// only finds its own registration: it never reads nor takes over the legacy one.
const loadRegistration = async (
  platformId: string,
  tenantId?: string | null,
  filter?: PlatformConfigurationMutator
) => {
  const registration =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
      platformId,
      { ...filter, tenantId }
    );
  if (
    registration ||
    !RegistrationHelper.inheritsLegacyRegistration(tenantId)
  ) {
    return registration;
  }
  return PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
    platformId,
    { ...filter, tenant_id: null }
  );
};

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

// A larger page size is clamped: the API never returns more rows at once.
const ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE = 100;

type DeactivatedRegistration = Pick<
  PlatformConfiguration,
  | 'service_instance_id'
  | 'platform_id'
  | 'platform_contract'
  | 'platform_version'
  | 'platform_url'
  | 'tenant_id'
>;

// Moves an active registration to inactive, then tells the organization admins and telemetry. Returns false, and does
// nothing else, when the registration was no longer active. A registration without owner organization is still
// deactivated, but nobody is mailed and no telemetry event is sent.
const deactivateRegistration = async ({
  registration,
  platformIdentifier,
  organization,
  actorId,
}: {
  registration: DeactivatedRegistration;
  platformIdentifier: PlatformIdentifier;
  organization: Organization | null;
  actorId: UserId;
}): Promise<boolean> => {
  const deactivated = await PlatformConfigurationDomain.deactivateConfiguration(
    registration.service_instance_id
  );
  if (!deactivated) {
    return false;
  }

  if (!organization) {
    logApp.warn('Unregistered a platform without owner organization', {
      serviceInstanceId: registration.service_instance_id,
    });
    return true;
  }

  const users = await UserDomain.loadUsersByCapabilitiesInOrganization(
    organization.id,
    [
      OrganizationCapability.AdministrateOrganization,
      OrganizationCapability.ManagePlatformRegistration,
    ]
  );

  // The registration is already inactive: a mail that fails is logged, it does not fail the unregistration, and a
  // retry would find nothing left to do.
  await Promise.all(
    users.map((user) =>
      sendMail({
        to: user.email,
        template: 'platform_unregistered',
        params: {
          adminName: formatName(user.first_name ?? ''),
          platformIdentifier,
        },
      }).catch((error: unknown) => {
        logApp.error('Unable to send the platform unregistered mail', {
          error,
          userId: user.id,
          serviceInstanceId: registration.service_instance_id,
        });
      })
    )
  );

  try {
    const unregisterEvent = TelemetryHelper.buildUnregisterEvent(
      organization,
      actorId,
      platformIdentifier,
      registration.platform_id,
      registration.platform_contract,
      registration.platform_version,
      registration.platform_url,
      registration.tenant_id ?? undefined
    );
    await TelemetryApp.sendTelemetryEvent(unregisterEvent);
  } catch (error) {
    logApp.error('Unable to send telemetry event for unregistration', {
      error,
    });
  }
  return true;
};

export const RegistrationApp = {
  loadPlatformAssociatedOrganization: async (
    platformId: string,
    tenantId?: string | null
  ): Promise<Organization | null> => {
    const user = requestContext.requireUser();
    const resolvedConfiguration = await loadRegistration(platformId, tenantId);
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

    await securityGuard.assertUserIsInOrganization(
      user,
      subscription.organization_id
    );

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

  // Same tenant fallback as loadRegistration: the OpenAEV default tenant finds the legacy tenant-less registration.
  loadRegisteredPlatformByPlatformId: async ({
    identifier,
    platformId,
    tenantId,
  }: RegisteredPlatformByPlatformIdInput): Promise<RegisteredPlatform | null> => {
    // The ids come from a redirect URL and are uuid columns: anything else matches no registration.
    if (!isUuid(platformId) || (tenantId && !isUuid(tenantId))) {
      return null;
    }
    const loadForTenant = (lookupTenantId: string | null) =>
      RegistrationDomain.loadRegisteredPlatformByPlatformId({
        platformIdentifier: identifier,
        platformId,
        tenantId: lookupTenantId,
      });
    const platform =
      (await loadForTenant(tenantId ?? null)) ??
      (RegistrationHelper.inheritsLegacyRegistration(tenantId)
        ? await loadForTenant(null)
        : null);

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
  }: RegisterPlatformInput): Promise<{
    token: string;
    organizationName: string | null;
  }> => {
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

    if (platform.tenantId && !RegistrationHelper.usesTenants(identifier)) {
      throw new Error(BadRequestErrorCode.TenantIdNotSupported);
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

    // A platform_id belongs to one product, whatever the tenant of its registrations.
    const anyRegistration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByPlatform(
        platform.id
      );
    if (anyRegistration && anyRegistration.platformIdentifier !== identifier) {
      throw new Error(ErrorCode.InvalidPlatformIdentifier);
    }

    const existingRegistration = await loadRegistration(
      platform.id,
      platform.tenantId
    );
    const platformConfiguration = existingRegistration?.platformConfiguration;

    const existingConfigTenantId = platformConfiguration?.tenant_id;
    if (existingConfigTenantId && !platform.tenantId) {
      throw new Error(BadRequestErrorCode.TenantIdMandatory);
    }

    // Loaded before the registration is saved: a failed read must not lose the token of a saved registration.
    const selectedOrga = await OrganizationDomain.loadOrganizationBy({
      id: organizationId as OrganizationId,
    });

    await withTransaction(async () => {
      if (platformConfiguration) {
        await RegistrationDomain.refreshExistingPlatform({
          serviceInstanceId: platformConfiguration.service_instance_id,
          targetOrganizationId: organizationId as OrganizationId,
          configuration,
        });
        return;
      }
      await RegistrationDomain.registerNewPlatform({
        serviceDefinitionId: serviceDefinition.id,
        organizationId: organizationId as OrganizationId,
        configuration,
        platformIdentifier: identifier,
      });
    });

    // Fire and forget: it never throws and must not delay nor break the registration
    void NewsFeedApp.backfillBlogpostsForPlatform({
      platformId: platform.id,
      platformIdentifier: identifier,
      platformVersion: platform.version,
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

    return { token, organizationName: selectedOrga?.name ?? null };
  },

  unregisterPlatform: async ({
    platformId,
    identifier,
    tenantId,
  }: UnregisterPlatformInput) => {
    const resolvedConfiguration = await loadRegistration(platformId, tenantId, {
      status: PlatformConfigurationStatus.Active,
    });
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
    const organization = await OrganizationDomain.loadOrganizationBy({
      id: subscription.organization_id,
    });

    await deactivateRegistration({
      registration: platformConfiguration,
      platformIdentifier: identifier,
      organization: organization ?? null,
      actorId: user.id,
    });
  },

  // A platform admin unregisters a platform of any organization, so the organization capability check is skipped.
  // Only a registration the admin list shows can be unregistered: a disabled service instance is not registered.
  adminUnregisterPlatform: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<void> => {
    const admin = requestContext.requireUser();
    const listed =
      await RegistrationDomain.loadAdminRegisteredPlatform(serviceInstanceId);
    const platformIdentifier = listed
      ? platformIdentifierMappedByServiceDefinitionIdentifier[
          listed.service_definition_identifier
        ]
      : undefined;
    if (!listed || !platformIdentifier) {
      throw new Error(ErrorCode.PlatformNotRegistered);
    }
    if (listed.status !== PlatformConfigurationStatus.Active) {
      return;
    }

    // For now, a trial is only ended through its own lifecycle: an admin cannot disconnect it.
    if (listed.is_trial) {
      throw new Error(ErrorCode.TrialPlatformCannotBeUnregistered);
    }

    // The same owner the admin list and its confirmation dialog show: the organization of the newest subscription.
    const [owner] =
      await RegistrationDomain.loadPlatformOwnerOrganizationsByServiceInstanceIds(
        [serviceInstanceId]
      );

    const deactivated = await deactivateRegistration({
      registration: listed,
      platformIdentifier,
      organization: owner ?? null,
      actorId: admin.id,
    });
    if (deactivated) {
      logApp.info('Platform unregistered by a platform admin', {
        adminId: admin.id,
        serviceInstanceId,
        platformId: listed.platform_id,
        tenantId: listed.tenant_id,
        organizationId: owner?.id ?? null,
      });
    }
  },

  loadAdminRegisteredPlatforms: async ({
    first,
    after,
    orderBy,
    orderMode,
    searchTerm,
    filter,
  }: QueryAdminRegisteredPlatformsArgs): Promise<AdminRegisteredPlatformConnection> => {
    const offset = decodeOffsetCursor(after);
    const { rows, totalCount } =
      await RegistrationDomain.loadAdminRegisteredPlatforms({
        filters: {
          platformIdentifier: filter?.identifier ?? undefined,
          status: filter?.status ?? undefined,
          organizationId: filter?.organizationId ?? undefined,
          searchTerm: searchTerm ?? undefined,
        },
        offset,
        limit: Math.min(
          Math.max(first, 1),
          ADMIN_REGISTERED_PLATFORMS_MAX_PAGE_SIZE
        ),
        orderBy:
          orderBy ?? AdminRegisteredPlatformOrdering.LastConnectivityCheck,
        orderMode: orderMode ?? OrderingMode.Desc,
      });
    // Not paginate() from knexfile.ts: it selects PlatformConfiguration.* (the token included) and counts an `id`
    // column that PlatformConfiguration does not have.
    const edges = rows.map((row, index) => ({
      cursor: encodeOffsetCursor(offset + index + 1),
      node: mapAdminRegisteredPlatformRowToGraphQL(row),
    }));
    return {
      edges,
      totalCount,
      pageInfo: {
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
        hasNextPage: offset + rows.length < totalCount,
        hasPreviousPage: offset > 0,
      },
    };
  },

  isPlatformRegistered: async (
    input: IsPlatformRegisteredInput
  ): Promise<IsPlatformRegisteredResponse> => {
    const registration = await loadRegistration(
      input.platformId,
      input.tenantId
    );
    if (!registration) {
      return { status: PlatformRegistrationStatus.NeverRegistered };
    }
    const { platformConfiguration } = registration;

    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id: platformConfiguration.service_instance_id,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }

    const status =
      platformConfiguration.status === PlatformConfigurationStatus.Active
        ? PlatformRegistrationStatus.Registered
        : PlatformRegistrationStatus.Unregistered;

    // Anyone signed in may ask about a platform_id: only the owner organization's members learn who owns it.
    // Bypass users too, so they refresh the platform in its owner organization instead of moving it.
    const user = requestContext.requireUser();
    if (
      !AuthHelper.userHasBypassCapability(user) &&
      !(await securityGuard.isUserInOrganization(
        user,
        subscription.organization_id
      ))
    ) {
      return { status };
    }

    return {
      status,
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
    organizationName: string | null;
    isInOrganization: boolean;
  }> => {
    const resolvedConfiguration = await loadRegistration(platformId, tenantId, {
      status: PlatformConfigurationStatus.Active,
    });
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
    const organization = isAllowed
      ? await OrganizationDomain.loadOrganizationBy({
          id: subscription.organization_id,
        })
      : undefined;

    return {
      isAllowed,
      isInOrganization,
      // Allowed users (bypass included) count as in the organization: outsiders never learn who owns the platform.
      organizationId: isInOrganization ? subscription.organization_id : null,
      organizationName: organization?.name ?? null,
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

    // A trial an admin unregistered still passes its deployment request: it must not overwrite the registration, nor
    // announce a registration that stays inactive.
    const existingRegistration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByServiceInstance(
        deploymentRequest.service_instance_id
      );
    if (
      existingRegistration &&
      existingRegistration.platformConfiguration.status !==
        PlatformConfigurationStatus.Active
    ) {
      logApp.info('Ignored the auto registration of an unregistered platform', {
        serviceInstanceId: deploymentRequest.service_instance_id,
        platformId: input.platform.id,
      });
      return;
    }

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

    // After the commit, fire and forget: it never throws and must not delay nor break the registration
    void NewsFeedApp.backfillBlogpostsForPlatform({
      platformId: input.platform.id,
      platformIdentifier,
      platformVersion: input.platform.version,
    });
  },
};

const mapAdminRegisteredPlatformRowToGraphQL = (
  row: AdminRegisteredPlatformRow
): AdminRegisteredPlatform => {
  const identifier =
    platformIdentifierMappedByServiceDefinitionIdentifier[
      row.service_definition_identifier
    ];
  if (!identifier) {
    throw new Error(ErrorCode.InvalidPlatformIdentifier);
  }
  return {
    service_instance_id: row.service_instance_id,
    platform_id: row.platform_id,
    title: row.platform_title,
    url: row.platform_url,
    identifier,
    version: row.platform_version,
    contract: row.platform_contract,
    commercial_model: row.commercial_model,
    tenant_id: row.tenant_id,
    tenant_name: row.tenant_name,
    status: row.status,
    last_connectivity_check: row.last_connectivity_check,
    organization:
      row.organization_id && row.organization_name
        ? { id: row.organization_id, name: row.organization_name }
        : null,
    registerer: row.registerer_email
      ? {
          id: row.registerer_id,
          email: row.registerer_email,
          first_name: row.registerer_first_name,
          last_name: row.registerer_last_name,
        }
      : null,
    credential: {
      kind: row.has_token
        ? RegisteredPlatformCredentialKind.Token
        : RegisteredPlatformCredentialKind.None,
    },
    is_trial: row.is_trial,
  };
};

export const mapDomainRegisteredPlatformToGraphQL = (
  platform: DomainRegisteredPlatform
): RegisteredPlatform => {
  const PLATFORM_TRIAL_TITLES: Partial<
    Record<ServiceDefinitionIdentifier, string>
  > = {
    [ServiceDefinitionIdentifier.OpenctiRegistration]:
      'OpenCTI - Free Trial Platform',
    [ServiceDefinitionIdentifier.OpenaevRegistration]:
      'OpenAEV - Free Trial Platform',
    [ServiceDefinitionIdentifier.XtmoneRegistration]:
      'XTM One - Free Trial Platform',
  };

  const defaultTitle =
    PLATFORM_TRIAL_TITLES[platform.identifier] ?? 'Free Trial Platform';
  return {
    __typename: 'RegisteredPlatform',
    id: platform.id,
    service_instance_id: platform.id as ServiceInstanceId,
    platform_id: platform.platform_id ?? platform.id,
    last_connectivity_check: platform?.last_connectivity_check ?? null,
    status: platform.status ?? null,
    commercial_model: platform.commercial_model ?? null,
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
  if (!PLATFORM_ACCEPTED_HUB_STATUSES.includes(deploymentRequest.hub_status)) {
    throw new Error(ForbiddenErrorCode.NotAllowedByDeploymentStatus);
  }
};
