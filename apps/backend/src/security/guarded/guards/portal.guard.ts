import { PortalCapability } from '../../../__generated__/resolvers-types';
import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import { allow, deny, forCaller, Guard } from '../guard.types';

// Same rule as hasCapability of the @auth directive: BYPASS passes everything,
// otherwise one of the named capabilities is required
export const portalCapabilityGuard = (
  capabilities: readonly [PortalCapability, ...PortalCapability[]]
): Guard =>
  forCaller('user', (user) =>
    user.isBypassUser ||
    capabilities.some((capability) => user.portalCapabilities.has(capability))
      ? allow()
      : deny(ForbiddenErrorCode.ForbiddenAccess)
  );

export const bypassOnlyGuard = (): Guard =>
  forCaller('user', (user) =>
    user.isBypassUser ? allow() : deny(ForbiddenErrorCode.ForbiddenAccess)
  );

// Same rule as @auth without arguments
export const loggedInGuard = (): Guard => forCaller('user', () => allow());
