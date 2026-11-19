import { PortalCapability } from '../../__generated__/resolvers-types';
import type DeploymentRequest from '../../model/kanel/public/DeploymentRequest';
import type Organization from '../../model/kanel/public/Organization';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import type { FullPlatformConfiguration } from '../../modules/registration/platform-configuration/platform-configuration.domain';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';
import {
  loadPlatformCredentialMatch,
  PLATFORM_ID_HEADER,
  PLATFORM_TOKEN_HEADER,
} from '../../modules/security-management/token/platform-token.util';
import { PLATFORM_USER_UUID, SYSTEM_USER_UUID } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { isValidSystemToken, SYSTEM_TOKEN_HEADER } from '../machine-user';

// Structural on purpose: the SSE context is only { user, req }, not a full PortalContext
export interface GuardedContext {
  user?: UserLoadUserBy | null;
  req?: { headers?: Readonly<Record<string, unknown>> };
}

export type PrincipalBuilder = (
  context: GuardedContext
) => Principal | Promise<Principal>;

interface PlatformPrincipalBase {
  kind: 'platform';
  actorId: UserId;
  platformId: string;
  organization: Organization;
}

export type PlatformPrincipal = PlatformPrincipalBase &
  (
    | { credential: 'registration'; registration: FullPlatformConfiguration }
    | { credential: 'deploymentRequest'; deploymentRequest: DeploymentRequest }
  );

export type Principal =
  | { kind: 'anonymous' }
  | {
      kind: 'user';
      actorId: UserId;
      isBypassUser: boolean;
      portalCapabilities: Set<PortalCapability>;
      selectedOrganizationId: OrganizationId;
      memberships: NonNullable<UserLoadUserBy['organization_capabilities']>;
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

// A system operation is judged on its token alone, never on the session
export const buildSystemPrincipal = (
  context: GuardedContext,
  systemScopes: readonly PortalCapability[]
): Principal => {
  const token = context.req?.headers?.[SYSTEM_TOKEN_HEADER];
  if (typeof token !== 'string' || !isValidSystemToken(token)) {
    logApp.warn('Invalid system token attempt');
    return ANONYMOUS_PRINCIPAL;
  }
  return {
    kind: 'system',
    actorId: SYSTEM_USER_UUID,
    portalCapabilities: grantedSystemScopes(systemScopes),
  };
};

// A platform operation is judged on the platform headers alone, never on the session
export const buildPlatformPrincipal = async (
  context: GuardedContext
): Promise<Principal> => {
  const platformId = context.req?.headers?.[PLATFORM_ID_HEADER];
  const token = context.req?.headers?.[PLATFORM_TOKEN_HEADER];
  if (
    typeof platformId !== 'string' ||
    typeof token !== 'string' ||
    !platformId ||
    !token
  ) {
    logApp.warn('Missing platform credentials');
    return ANONYMOUS_PRINCIPAL;
  }

  const match = await loadPlatformCredentialMatch({
    platform_id: platformId,
    token,
  });
  const organization = match?.organization;
  if (!match || !organization) {
    logApp.warn('Invalid platform credentials attempt');
    return ANONYMOUS_PRINCIPAL;
  }

  const base = {
    kind: 'platform',
    actorId: PLATFORM_USER_UUID,
    platformId: match.platformId,
    organization,
  } as const;
  return match.credential === 'registration'
    ? {
        ...base,
        credential: 'registration',
        registration: match.registration,
      }
    : {
        ...base,
        credential: 'deploymentRequest',
        deploymentRequest: match.deploymentRequest,
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
  };
};
