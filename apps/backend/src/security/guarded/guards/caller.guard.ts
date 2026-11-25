import { PortalCapability } from '../../../__generated__/resolvers-types';
import { ForbiddenErrorCode } from '../../../utils/error/error.code';
import type { PlatformCredential } from '../../platform-credential';
import { allow, deny, forCaller, Guard } from '../guard.types';
import { buildPlatformPrincipal, buildSystemPrincipal } from '../principal';

export const systemCallerGuard = (
  scopes: readonly [PortalCapability, ...PortalCapability[]]
): Guard =>
  forCaller(
    'system',
    (system) =>
      scopes.every((scope) => system.portalCapabilities.has(scope))
        ? allow()
        : deny(ForbiddenErrorCode.ForbiddenAccess),
    (context) => buildSystemPrincipal(context, scopes)
  );

export const platformCallerGuard = ({
  credential,
}: {
  credential: PlatformCredential;
}): Guard =>
  forCaller('platform', () => allow(), buildPlatformPrincipal(credential));
