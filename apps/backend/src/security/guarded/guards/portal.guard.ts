import { PortalCapability } from '../../../__generated__/resolvers-types';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../../utils/error/error.code';
import { allow, deny, Guard } from '../guard.types';

// Same rule as hasCapability of the @auth directive: BYPASS passes everything,
// otherwise one of the named capabilities is required
export const portalCapabilityGuard =
  (capabilities: readonly [PortalCapability, ...PortalCapability[]]): Guard =>
  (principal) => {
    if (principal.kind === 'anonymous') {
      return deny(UnauthenticatedErrorCode.Unauthenticated);
    }
    const isAllowed =
      principal.isBypassUser ||
      capabilities.some((capability) =>
        principal.portalCapabilities.has(capability)
      );
    return isAllowed ? allow() : deny(ForbiddenErrorCode.ForbiddenAccess);
  };

export const bypassOnlyGuard = (): Guard => (principal) => {
  if (principal.kind === 'anonymous') {
    return deny(UnauthenticatedErrorCode.Unauthenticated);
  }
  return principal.isBypassUser
    ? allow()
    : deny(ForbiddenErrorCode.ForbiddenAccess);
};
