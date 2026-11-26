import { PortalCapability } from '../../../__generated__/resolvers-types';
import { UserId } from '../../../model/kanel/public/User';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import type { PlatformCredential } from '../../platform-credential';
import { allow, deny, forCaller, Guard } from '../guard.types';
import {
  buildPlatformPrincipal,
  buildPrincipal,
  buildSystemPrincipal,
} from '../principal';
import { AsyncSource, Source } from '../sources';

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

export const sessionCallerGuard = (): Guard =>
  forCaller(
    'user',
    (user) =>
      user.apiToken ? deny(ForbiddenErrorCode.NotAllowedWithApiToken) : allow(),
    buildPrincipal,
    true
  );

// NOT_FOUND, not FORBIDDEN_ACCESS: a refusal must not tell a non-owner that the record exists
export const callerIsGuard = <Args = unknown>({
  user: source,
}: {
  user: Source<Args, UserId> | AsyncSource<Args, UserId>;
}): Guard<Args> =>
  forCaller<'user', Args>('user', async (user, args) => {
    const userId = await source(user, args);
    return userId && userId === user.actorId
      ? allow()
      : deny(NotFoundErrorCode.NotFound);
  });
