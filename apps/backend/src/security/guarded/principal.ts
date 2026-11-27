import {
  ApiTokenScope,
  PortalCapability,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { ApiTokenId } from '../../model/kanel/public/ApiToken';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';
import {
  authenticatePlatform,
  buildPlatformAuthenticationError,
} from '../../modules/security-management/token/platform-authentication.util';
import { PLATFORM_USER_UUID, SYSTEM_USER_UUID } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import {
  isAcceptedPlatformMatch,
  PlatformCredential,
  PlatformCredentialMatch,
} from '../platform-credential';
import { isValidSystemToken, SYSTEM_TOKEN_HEADER } from '../system-token';

// Structural on purpose: the SSE context is only { user, req }, not a full PortalContext
export interface GuardedContext {
  user?: UserLoadUserBy | null;
  req?: { headers?: Readonly<Record<string, unknown>> };
}

export type PrincipalBuilder = (
  context: GuardedContext
) => Principal | Promise<Principal>;

export type PlatformPrincipal = {
  kind: 'platform';
  actorId: UserId;
} & PlatformCredentialMatch;

export type Principal =
  | { kind: 'anonymous' }
  | {
      kind: 'user';
      actorId: UserId;
      isBypassUser: boolean;
      portalCapabilities: Set<PortalCapability>;
      selectedOrganizationId: OrganizationId;
      memberships: NonNullable<UserLoadUserBy['organization_capabilities']>;
      // Set when an API token authenticated the request
      apiToken?: { id: ApiTokenId; scope: ApiTokenScope };
    }
  | {
      kind: 'system';
      actorId: UserId;
      portalCapabilities: ReadonlySet<PortalCapability>;
    }
  | PlatformPrincipal;

// Shared by every @Public() call: frozen so no caller can alter it for the next one
export const ANONYMOUS_PRINCIPAL: Readonly<{ kind: 'anonymous' }> =
  Object.freeze({ kind: 'anonymous' });

// Until scoped tokens, the single system token is granted every requested scope
const grantedSystemScopes = (
  requestedScopes: readonly PortalCapability[]
): ReadonlySet<PortalCapability> => new Set(requestedScopes);

const headerValue = (
  context: GuardedContext,
  name: string
): string | undefined => {
  const value = context.req?.headers?.[name];
  return typeof value === 'string' ? value : undefined;
};

// A system operation is judged on its token alone, never on the session
export const buildSystemPrincipal = (
  context: GuardedContext,
  systemScopes: readonly PortalCapability[]
): Principal => {
  const token = headerValue(context, SYSTEM_TOKEN_HEADER);
  if (!token || !isValidSystemToken(token)) {
    logApp.warn('Invalid system token attempt');
    return ANONYMOUS_PRINCIPAL;
  }
  return {
    kind: 'system',
    actorId: SYSTEM_USER_UUID,
    portalCapabilities: grantedSystemScopes(systemScopes),
  };
};

export type PlatformCallerOf<Credential extends PlatformCredential> = Extract<
  PlatformPrincipal,
  { credential: Credential }
>;

const isPlatformCaller = <Credential extends PlatformCredential>(
  platformCaller: PlatformPrincipal | undefined,
  credential: Credential
): platformCaller is PlatformCallerOf<Credential> =>
  platformCaller?.credential === credential;

// Unreachable behind the platformCallerGuard of the same credential
export const requirePlatformCaller = <Credential extends PlatformCredential>(
  context: { platformCaller?: PlatformPrincipal },
  credential: Credential
): PlatformCallerOf<Credential> => {
  const { platformCaller } = context;
  if (!isPlatformCaller(platformCaller, credential)) {
    throw new Error(`A ${credential} platform caller is required`);
  }
  return platformCaller;
};

// A platform operation is judged on the platform headers alone, never on the session: a signed assertion, else the
// platform id and token. The token lookup is shared with @platform_token and also matches an inactive registration or
// a deployment request in any status: only the credential this operation requires, in a status it accepts, makes a
// platform caller
export const buildPlatformPrincipal =
  (credential: PlatformCredential): PrincipalBuilder =>
  async (context) => {
    const authentication = await authenticatePlatform(context.req);
    if (authentication.outcome === 'missing') {
      return ANONYMOUS_PRINCIPAL;
    }
    // Thrown rather than answered UNAUTHENTICATED: the platform must learn that its assertion or its token is refused
    // (PLATFORM_ASSERTION_INVALID, PLATFORM_KEY_MISMATCH, PLATFORM_TOKEN_REFUSED) to reconnect. `enforce` does not
    // catch an error of the principal builder, so it reaches the client as it is.
    if (authentication.outcome === 'refused') {
      throw buildPlatformAuthenticationError(authentication.code);
    }

    const { match } = authentication;
    if (
      !match ||
      match.credential !== credential ||
      !isAcceptedPlatformMatch(match)
    ) {
      logApp.warn('Rejected platform credentials');
      return ANONYMOUS_PRINCIPAL;
    }

    return {
      kind: 'platform',
      actorId: PLATFORM_USER_UUID,
      ...match,
    };
  };

export const buildPrincipal = async (
  context: GuardedContext
): Promise<Principal> => {
  const { user } = context;
  if (!user || user.disabled) {
    return ANONYMOUS_PRINCIPAL;
  }

  // Same object as the session user, which AuthHelper reads later on
  if (!user.capabilities) {
    user.capabilities = await UserDomain.getCapabilities(user.id);
  }

  // Set by the request middleware for a request a Bearer token authenticated, whose `context.user` is narrowed to it
  const apiToken = requestContext.get()?.apiToken;

  return {
    kind: 'user',
    actorId: user.id,
    isBypassUser: AuthHelper.userHasBypassCapability(user),
    portalCapabilities: new Set(
      // Names are inserted by migrations, one per PortalCapability value. An unknown one never matches a guard
      user.capabilities.map(({ name }) => name as PortalCapability)
    ),
    selectedOrganizationId: user.selected_organization_id,
    memberships: user.organization_capabilities ?? [],
    ...(apiToken && { apiToken: { id: apiToken.id, scope: apiToken.scope } }),
  };
};
