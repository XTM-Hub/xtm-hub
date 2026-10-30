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
import PlatformConfiguration from '../../model/kanel/public/PlatformConfiguration';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode, ErrorCode } from '../../utils/error/error.code';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import { RegistrationHelper } from './registration.helper';

const handleTenantUpgrade = async ({
  platform_id,
  token,
  tenant_id,
  tenant_name,
  platform_identifier,
}: {
  platform_id: string;
  token: string;
  tenant_id: string;
  tenant_name: string;
  platform_identifier: PlatformIdentifier;
}): Promise<PlatformConfiguration | null> => {
  const configWithoutTenant =
    await PlatformConfigurationDomain.loadConfigurationByPlatformAndToken({
      platform_id,
      token,
      withoutTenantId: true,
    });

  if (
    configWithoutTenant &&
    !RegistrationHelper.isTenantIdRequired(
      platform_identifier,
      configWithoutTenant.platform_version
    )
  ) {
    await PlatformConfigurationDomain.updateConfiguration(
      configWithoutTenant.service_instance_id,
      { tenant_id, tenant_name }
    );
    return { ...configWithoutTenant, tenant_id, tenant_name };
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
  const shouldUpdateContract =
    RegistrationHelper.shouldUpdateContractFromRefresh(
      platformConfiguration.platform_contract,
      platform_contract
    );
  const hasConfigChanged =
    platformConfiguration.platform_version !== platform_version ||
    (platform_url && platformConfiguration.platform_url !== platform_url) ||
    (tenant_name && platformConfiguration.tenant_name !== tenant_name) ||
    shouldUpdateContract;

  if (hasConfigChanged) {
    await PlatformConfigurationDomain.updateConfiguration(
      platformConfiguration.service_instance_id,
      {
        last_connectivity_check: new Date(),
        platform_version,
        ...(platform_url ? { platform_url } : {}),
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
}): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
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
    !platformConfiguration && tenant_id && tenant_name && platform_identifier;
  if (canAttemptTenantUpgrade) {
    platformConfiguration = await handleTenantUpgrade({
      platform_id,
      token,
      tenant_id,
      tenant_name,
      platform_identifier,
    });
  }

  if (!platformConfiguration) {
    return resolveStatusWhenNoConfiguration({
      platform_identifier,
      platform_version,
    });
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
    status:
      platformConfiguration.status === PlatformConfigurationStatus.Active
        ? PlatformRegistrationConnectivityStatus.Active
        : PlatformRegistrationConnectivityStatus.Inactive,
  };
};

export const RegistrationConnectivityApp = {
  refreshPlatformRegistrationConnectivityStatus: async (
    input: RefreshPlatformRegistrationConnectivityStatusInput
  ): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
    return refreshConnectivityStatus({
      platform_identifier: input.platformIdentifier ?? undefined,
      platform_version: input.platformVersion,
      platform_id: input.platformId,
      token: input.token,
      platform_contract: input.platformContract ?? undefined,
    });
  },

  refreshPlatformRegistrationConnectivityStatusSingleTenant: async (
    input: RefreshPlatformRegistrationConnectivityStatusSingleTenantInput
  ): Promise<{ status: PlatformRegistrationConnectivityStatus }> => {
    return refreshConnectivityStatus({
      platform_identifier: input.platformIdentifier,
      platform_version: input.platformVersion,
      platform_id: input.platformId,
      token: input.token,
      url: input.url,
      tenant_id: input.tenantId,
      tenant_name: input.tenantName,
      platform_contract: input.platformContract ?? undefined,
    });
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
        }).then(({ status }) => ({ tenantId: tenant.tenantId, status }))
      )
    );
    const statuses = results.map((result, index) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const tenant = input.tenants[index]!;
      if (result.status === 'fulfilled') {
        return result.value;
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

    const knownTenantIds = input.tenants.map((t) => t.tenantId);
    const staleConfigurations =
      await PlatformConfigurationDomain.loadActiveConfigurationsByPlatformExcludingTenants(
        input.platformId,
        knownTenantIds
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
