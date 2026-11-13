import { PortalCapability } from '../../../__generated__/resolvers-types';
import { ErrorType } from '../../../utils/error/error.type';
import { allow, deny, Guard } from '../guard.types';

// Same rule as hasCapability of the @auth directive: BYPASS passes everything,
// otherwise one of the named capabilities is required
export const portalCapabilityGuard =
  (capabilities: readonly [PortalCapability, ...PortalCapability[]]): Guard =>
  (principal) => {
    if (principal.kind === 'anonymous') {
      return deny(ErrorType.Unauthenticated);
    }
    const isAllowed =
      principal.isPlatformAdmin ||
      capabilities.some((capability) =>
        principal.portalCapabilities.has(capability)
      );
    return isAllowed ? allow() : deny(ErrorType.ForbiddenAccess);
  };
