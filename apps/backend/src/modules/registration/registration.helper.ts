import {
  PlatformContract,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';

// OpenAEV gives its registration from before tenants to this tenant when it upgrades: Tenant.DEFAULT_TENANT_UUID and the
// V4_99__Add_tenant_xtmhub_registration migration in OpenAEV.
export const OPENAEV_DEFAULT_TENANT_ID = '2cffad3a-0001-4078-b0e2-ef74274022c3';

export const RegistrationHelper = {
  // The trial contract belongs to the hub trial deployments: a connectivity refresh only moves a platform between CE and EE.
  shouldUpdateContractFromRefresh: (
    storedContract: PlatformContract,
    refreshedContract?: PlatformContract | null
  ): refreshedContract is PlatformContract =>
    !!refreshedContract &&
    refreshedContract !== storedContract &&
    storedContract !== PlatformContract.Trial &&
    refreshedContract !== PlatformContract.Trial,

  // Returns true when the product registers per tenant from some version on (OpenAEV). OpenCTI never does.
  usesTenants: (identifier: PlatformIdentifier): boolean =>
    !!RequiredPlatformVersions.TenantIdRequired[identifier],

  // Returns true for the only tenant that takes over the tenant-less registration of its platform: the OpenAEV default one.
  inheritsLegacyRegistration: (tenantId?: string | null): boolean =>
    tenantId === OPENAEV_DEFAULT_TENANT_ID,

  // Returns true when the platform version meets or exceeds the configured threshold for tenantId.
  // A null threshold means tenantId is never required for that identifier.
  // A missing or invalid version is treated as legacy (no tenantId required).
  isTenantIdRequired: (
    identifier: PlatformIdentifier,
    version?: string | null
  ): boolean => {
    const requiredVersion =
      RequiredPlatformVersions.TenantIdRequired[identifier];
    if (!requiredVersion) return false;
    if (!version || !isValidVersion(version)) return false;
    return doesVersionSatisfy({ givenVersion: version, requiredVersion });
  },
};
