import { PortalCapability } from '../../../__generated__/resolvers-types';
import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import { allow, deny, forCaller, Guard } from '../guard.types';

export const callerGuard = (
  caller: 'system',
  scopes: readonly [PortalCapability, ...PortalCapability[]]
): Guard =>
  Object.assign(
    forCaller(caller, (system) =>
      scopes.every((scope) => system.portalCapabilities.has(scope))
        ? allow()
        : deny(ForbiddenErrorCode.ForbiddenAccess)
    ),
    { systemScopes: scopes }
  );
