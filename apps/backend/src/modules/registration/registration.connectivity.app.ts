import {
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
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';
import {
  PlatformConfigurationDomain,
  PlatformUrlSchema,
} from './platform-configuration/platform-configuration.domain';
import { RegistrationHelper } from './registration.helper';

const HOUR_IN_MS = 60 * 60 * 1000;

interface RefreshOutcome {
  status: PlatformRegistrationConnectivityStatus;
  // True when the platform id and token matched a registration.
  isTokenValid: boolean;
}

const isValidPlatformUrl = (url: string): boolean =>
  PlatformUrlSchema.safeParse(url).success;

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
}: {
  platformConfiguration: PlatformConfiguration;
  platform_version: string;
  platform_url?: string;
  tenant_name?: string;
  platform_contract?: PlatformContract;
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
      isTokenValid: false,
    };
  }

  await saveConfig({
    platformConfiguration,
    platform_version,
    platform_url: url,
    tenant_name,
    platform_contract,
  });

  return {
    status:
      platformConfiguration.status === PlatformConfigurationStatus.Active
        ? PlatformRegistrationConnectivityStatus.Active
        : PlatformRegistrationConnectivityStatus.Inactive,
    isTokenValid: true,
  };
};

export const RegistrationConnectivityApp = {
  refreshPlatformRegistrationConnectivityStatus: async (
    input: RefreshPlatformRegistrationConnectivityStatusInput
  ): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
    const { status } = await refreshConnectivityStatus({
      platform_identifier: input.platformIdentifier ?? undefined,
      platform_version: input.platformVersion,
      platform_id: input.platformId,
      token: input.token,
      platform_contract: input.platformContract ?? undefined,
    });
    return { status };
  },

  refreshPlatformRegistrationConnectivityStatusSingleTenant: async (
    input: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput
  ): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
    const { status } = await refreshConnectivityStatus({
      platform_identifier: input.platformIdentifier,
      platform_version: input.platformVersion,
      platform_id: input.platformId,
      token: input.token,
      url: input.url,
      tenant_id: input.tenantId,
      tenant_name: input.tenantName,
      platform_contract: input.platformContract ?? undefined,
    });
    return { status };
  },

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
    const statuses = results.map((result, index) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tenant = input.tenants[index]!;
      if (result.status === 'fulfilled') {
        return { tenantId: tenant.tenantId, status: result.value.status };
      }
      logApp.error(
        `Failed to refresh connectivity status for tenant ${tenant.tenantId}`,
        { error: result.reason }
      );
      return {
        tenantId: tenant.tenantId,
        status: PlatformRegistrationConnectivityStatus.Inactive,
      };
    });

    // A tenant token speaks only for its tenant: deactivating the tenants a call omits needs every submitted token
    // to be valid, and only reaches tenants their own instance has stopped refreshing.
    const areAllTokensValid =
      results.length > 0 &&
      results.every(
        (result) => result.status === 'fulfilled' && result.value.isTokenValid
      );
    if (!areAllTokensValid) {
      if (results.length > 0) {
        logApp.warn(
          'Skipped the deactivation of omitted tenants: not every submitted tenant token is valid',
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
