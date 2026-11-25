import {
  CommercialModel,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PlatformRegistrationConnectivityStatus,
  RefreshPlatformRegistrationConnectivityStatusAllTenantsInput,
  RefreshPlatformRegistrationConnectivityStatusInput,
  RefreshPlatformRegistrationConnectivityStatusSingleTenantInput,
  TenantStatus,
} from '../../__generated__/resolvers-types';
import portalConfig from '../../config';
import PlatformConfiguration from '../../model/kanel/public/PlatformConfiguration';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode, ErrorCode } from '../../utils/error/error.code';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { isUuid } from '../../utils/uuid.util';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import {
  PlatformConfigurationDomain,
  PlatformUrlSchema,
} from './platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from './registration.domain';
import { RegistrationHelper } from './registration.helper';

const HOUR_IN_MS = 60 * 60 * 1000;

type ServiceInstanceId = PlatformConfiguration['service_instance_id'];

interface ConnectivityStatus {
  status: PlatformRegistrationConnectivityStatus;
  // Null when no registration matches the platform id and token.
  commercialModel: CommercialModel | null;
}

interface RefreshOutcome extends ConnectivityStatus {
  // Service instance of the registration the platform id and token matched, whatever its status; null when none
  // matches.
  serviceInstanceId: ServiceInstanceId | null;
  // True when the platform id and token matched an active registration: an unregistered one authenticates nothing.
  isTokenValid: boolean;
}

interface RefreshResult extends ConnectivityStatus {
  // Organization the platform is registered in; null when no registration matches the platform id and token.
  organizationName: string | null;
}

const isValidPlatformUrl = (url: string): boolean =>
  PlatformUrlSchema.safeParse(url).success;

// One query for every service instance, whatever their number. The platform is already refreshed when it runs: a
// failed lookup leaves the organization names empty rather than failing the refresh.
const loadOwnerOrganizationNames = async (
  platformId: string,
  serviceInstanceIds: ServiceInstanceId[]
): Promise<Map<ServiceInstanceId, string>> => {
  if (serviceInstanceIds.length === 0) {
    return new Map();
  }
  try {
    const ownerOrganizations =
      await RegistrationDomain.loadPlatformOwnerOrganizationsByServiceInstanceIds(
        serviceInstanceIds
      );
    return new Map(
      ownerOrganizations.map((organization) => [
        organization.service_instance_id,
        organization.name,
      ])
    );
  } catch (error) {
    logApp.error('Failed to load the organizations of the refreshed platform', {
      platformId,
      error,
    });
    return new Map();
  }
};

const findOrganizationName = (
  organizationNames: Map<ServiceInstanceId, string>,
  serviceInstanceId: ServiceInstanceId | null
): string | null =>
  serviceInstanceId ? (organizationNames.get(serviceInstanceId) ?? null) : null;

const withOwnerOrganizationName = async (
  platformId: string,
  { status, commercialModel, serviceInstanceId }: RefreshOutcome
): Promise<RefreshResult> => {
  const organizationNames = await loadOwnerOrganizationNames(
    platformId,
    serviceInstanceId ? [serviceInstanceId] : []
  );
  return {
    status,
    commercialModel,
    organizationName: findOrganizationName(
      organizationNames,
      serviceInstanceId
    ),
  };
};

// Only a legacy OpenAEV registration, made before tenants were required, can move to a tenant. The platform type
// comes from the stored registration, never from the request.
const handleTenantUpgrade = async ({
  platform_id,
  token,
  tenant_id,
  tenant_name,
}: {
  platform_id: string;
  token: string;
  tenant_id: string;
  tenant_name: string;
}): Promise<PlatformConfiguration | null> => {
  if (!isUuid(tenant_id)) {
    return null;
  }

  const resolvedConfigWithoutTenant =
    await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
      {
        platform_id,
        token,
        withoutTenantId: true,
      }
    );

  if (
    resolvedConfigWithoutTenant?.platformIdentifier ===
      PlatformIdentifier.Openaev &&
    !RegistrationHelper.isTenantIdRequired(
      PlatformIdentifier.Openaev,
      resolvedConfigWithoutTenant.platformConfiguration.platform_version
    )
  ) {
    const { platformConfiguration } = resolvedConfigWithoutTenant;
    await PlatformConfigurationDomain.updateConfiguration(
      platformConfiguration.service_instance_id,
      { tenant_id, tenant_name }
    );
    return { ...platformConfiguration, tenant_id, tenant_name };
  }

  return null;
};

const resolveStatusWhenNoConfiguration = ({
  platform_identifier,
  platform_version,
}: {
  platform_identifier?: PlatformIdentifier;
  platform_version: string;
}): { status: PlatformRegistrationConnectivityStatus } => {
  if (!platform_identifier) {
    return { status: PlatformRegistrationConnectivityStatus.Inactive };
  }

  const requiredVersionForNotFoundStatus =
    RequiredPlatformVersions.RefreshConnectivityStatusSendsNotFound[
      platform_identifier
    ];

  if (!requiredVersionForNotFoundStatus) {
    return { status: PlatformRegistrationConnectivityStatus.Inactive };
  }

  const shouldSendNotFoundStatus = doesVersionSatisfy({
    givenVersion: platform_version,
    requiredVersion: requiredVersionForNotFoundStatus,
  });

  return {
    status: shouldSendNotFoundStatus
      ? PlatformRegistrationConnectivityStatus.NotFound
      : PlatformRegistrationConnectivityStatus.Inactive,
  };
};

const saveConfig = async ({
  platformConfiguration,
  platform_version,
  platform_url,
  tenant_name,
  platform_contract,
  platform_identifier,
}: {
  platformConfiguration: PlatformConfiguration;
  platform_version: string;
  platform_url?: string;
  tenant_name?: string;
  platform_contract?: PlatformContract;
  platform_identifier?: PlatformIdentifier;
}): Promise<void> => {
  const acceptedUrl =
    platform_url && isValidPlatformUrl(platform_url) ? platform_url : undefined;
  if (platform_url && !acceptedUrl) {
    logApp.warn(
      'Ignored an invalid platform URL sent by a connectivity refresh',
      {
        service_instance_id: platformConfiguration.service_instance_id,
      }
    );
  }

  const shouldUpdateContract =
    RegistrationHelper.shouldUpdateContractFromRefresh(
      platformConfiguration.platform_contract,
      platform_contract
    );
  const hasConfigChanged =
    platformConfiguration.platform_version !== platform_version ||
    (acceptedUrl && platformConfiguration.platform_url !== acceptedUrl) ||
    (tenant_name && platformConfiguration.tenant_name !== tenant_name) ||
    shouldUpdateContract;

  if (hasConfigChanged) {
    await PlatformConfigurationDomain.updateConfiguration(
      platformConfiguration.service_instance_id,
      {
        last_connectivity_check: new Date(),
        platform_version,
        ...(acceptedUrl ? { platform_url: acceptedUrl } : {}),
        ...(tenant_name ? { tenant_name } : {}),
        ...(shouldUpdateContract ? { platform_contract } : {}),
      }
    );
    if (shouldUpdateContract) {
      logApp.info('Platform contract updated from its connectivity refresh', {
        service_instance_id: platformConfiguration.service_instance_id,
        platform_id: platformConfiguration.platform_id,
        tenant_id: platformConfiguration.tenant_id,
        previous_contract: platformConfiguration.platform_contract,
        platform_contract,
      });
    }
    if (
      platformConfiguration.status === PlatformConfigurationStatus.Active &&
      platformConfiguration.platform_version !== platform_version
    ) {
      // Fire and forget: it never throws and must not delay the refresh
      void NewsFeedApp.backfillBlogpostsOnVersionChange({
        serviceInstanceId: platformConfiguration.service_instance_id,
        platformId: platformConfiguration.platform_id,
        platformIdentifier: platform_identifier,
        previousVersion: platformConfiguration.platform_version,
        newVersion: platform_version,
      });
    }
    return;
  }
  await PlatformConfigurationDomain.updateConfiguration(
    platformConfiguration.service_instance_id,
    {
      last_connectivity_check: new Date(),
    }
  );
};

const refreshConnectivityStatus = async ({
  platform_id,
  token,
  platform_version,
  url,
  tenant_id,
  tenant_name,
  platform_identifier,
  platform_contract,
}: {
  platform_id: string;
  token: string;
  platform_version: string;
  url?: string;
  tenant_id?: string;
  tenant_name?: string;
  platform_identifier?: PlatformIdentifier;
  platform_contract?: PlatformContract;
}): Promise<RefreshOutcome> => {
  if (!isValidVersion(platform_version)) {
    throw new Error(ErrorCode.InvalidPlatformVersion);
  }

  if (
    !tenant_id &&
    platform_identifier &&
    RegistrationHelper.isTenantIdRequired(platform_identifier, platform_version)
  ) {
    throw new Error(BadRequestErrorCode.TenantIdMandatory);
  }

  let platformConfiguration: PlatformConfiguration | null | undefined =
    await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
      platform_id,
      token,
      tenant_id,
    });

  const canAttemptTenantUpgrade =
    !platformConfiguration && tenant_id && tenant_name;
  if (canAttemptTenantUpgrade) {
    platformConfiguration = await handleTenantUpgrade({
      platform_id,
      token,
      tenant_id,
      tenant_name,
    });
  }

  if (!platformConfiguration) {
    return {
      ...resolveStatusWhenNoConfiguration({
        platform_identifier,
        platform_version,
      }),
      commercialModel: null,
      serviceInstanceId: null,
      isTokenValid: false,
    };
  }

  // An unregistered (inactive) registration only learns its status: what the platform sends no longer changes it, and
  // its token no longer vouches for the platform. It is loaded without activeOnly to answer inactive, not not-found.
  if (platformConfiguration.status !== PlatformConfigurationStatus.Active) {
    await PlatformConfigurationDomain.updateConfiguration(
      platformConfiguration.service_instance_id,
      { last_connectivity_check: new Date() }
    );
    return {
      status: PlatformRegistrationConnectivityStatus.Inactive,
      commercialModel: platformConfiguration.commercial_model,
      serviceInstanceId: platformConfiguration.service_instance_id,
      isTokenValid: false,
    };
  }

  await saveConfig({
    platformConfiguration,
    platform_version,
    platform_url: url,
    tenant_name,
    platform_contract,
    platform_identifier,
  });

  return {
    status: PlatformRegistrationConnectivityStatus.Active,
    commercialModel: platformConfiguration.commercial_model,
    serviceInstanceId: platformConfiguration.service_instance_id,
    isTokenValid: true,
  };
};

export const RegistrationConnectivityApp = {
  refreshPlatformRegistrationConnectivityStatus: async (
    input: RefreshPlatformRegistrationConnectivityStatusInput
  ): Promise<RefreshResult> =>
    withOwnerOrganizationName(
      input.platformId,
      await refreshConnectivityStatus({
        platform_identifier: input.platformIdentifier ?? undefined,
        platform_version: input.platformVersion,
        platform_id: input.platformId,
        token: input.token,
        platform_contract: input.platformContract ?? undefined,
      })
    ),

  refreshPlatformRegistrationConnectivityStatusSingleTenant: async (
    input: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput
  ): Promise<RefreshResult> =>
    withOwnerOrganizationName(
      input.platformId,
      await refreshConnectivityStatus({
        platform_identifier: input.platformIdentifier,
        platform_version: input.platformVersion,
        platform_id: input.platformId,
        token: input.token,
        url: input.url,
        tenant_id: input.tenantId,
        tenant_name: input.tenantName,
        platform_contract: input.platformContract ?? undefined,
      })
    ),

  refreshPlatformRegistrationConnectivityStatusAllTenants: async (
    input: RefreshPlatformRegistrationConnectivityStatusAllTenantsInput
  ): Promise<{ statuses: TenantStatus[] }> => {
    const results = await Promise.allSettled(
      input.tenants.map((tenant) =>
        refreshConnectivityStatus({
          platform_identifier: input.platformIdentifier,
          platform_version: input.platformVersion,
          platform_id: input.platformId,
          token: tenant.token,
          url: tenant.url,
          tenant_id: tenant.tenantId,
          tenant_name: tenant.tenantName,
          platform_contract: input.platformContract ?? undefined,
        })
      )
    );
    const organizationNames = await loadOwnerOrganizationNames(
      input.platformId,
      results.flatMap((result) =>
        result.status === 'fulfilled' && result.value.serviceInstanceId
          ? [result.value.serviceInstanceId]
          : []
      )
    );
    const statuses = results.map((result, index) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tenant = input.tenants[index]!;
      if (result.status === 'fulfilled') {
        return {
          tenantId: tenant.tenantId,
          status: result.value.status,
          commercialModel: result.value.commercialModel,
          organizationName: findOrganizationName(
            organizationNames,
            result.value.serviceInstanceId
          ),
        };
      }
      logApp.error(
        `Failed to refresh connectivity status for tenant ${tenant.tenantId}`,
        { error: result.reason }
      );
      return {
        tenantId: tenant.tenantId,
        status: PlatformRegistrationConnectivityStatus.Inactive,
        commercialModel: null,
        organizationName: null,
      };
    });

    // A tenant token speaks only for its tenant: deactivating the tenants a call omits needs every submitted token to
    // match a registration, and only reaches tenants their own instance has stopped refreshing. The platform keeps
    // sending the token of a tenant unregistered on the Hub, so an unregistered tenant does not block the cleanup,
    // but at least one token must be of an active registration: an unregistered one alone vouches for nothing.
    const fulfilledOutcomes = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    const canDeactivateOmittedTenants =
      fulfilledOutcomes.length === results.length &&
      fulfilledOutcomes.every(
        (outcome) => outcome.serviceInstanceId !== null
      ) &&
      fulfilledOutcomes.some((outcome) => outcome.isTokenValid);
    if (!canDeactivateOmittedTenants) {
      if (results.length > 0) {
        logApp.warn(
          'Skipped the deactivation of omitted tenants: a submitted tenant token matches no registration, or none is active',
          { platformId: input.platformId }
        );
      }
      return { statuses };
    }

    const knownTenantIds = input.tenants.map((t) => t.tenantId);
    const silentSince = new Date(
      Date.now() -
        portalConfig.registration.omitted_tenant_silence_hours * HOUR_IN_MS
    );
    const staleConfigurations =
      await PlatformConfigurationDomain.loadActiveConfigurationsByPlatformExcludingTenants(
        input.platformId,
        knownTenantIds,
        silentSince
      );

    await Promise.all(
      staleConfigurations.map((config) =>
        PlatformConfigurationDomain.updateConfiguration(
          config.service_instance_id,
          { status: PlatformConfigurationStatus.Inactive }
        ).catch((error) => {
          logApp.error(
            `Failed to deactivate stale configuration for service instance ${config.service_instance_id}`,
            { error }
          );
        })
      )
    );

    return { statuses };
  },
};
