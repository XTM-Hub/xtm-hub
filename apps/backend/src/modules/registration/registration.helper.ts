import {
  PlatformContract,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';

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
