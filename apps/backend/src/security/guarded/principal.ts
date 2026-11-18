import { PortalCapability } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';
import { SYSTEM_USER_UUID } from '../../portal.const';
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
    };

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
