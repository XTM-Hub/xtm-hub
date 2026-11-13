import { PortalCapability } from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { UserId } from '../../model/kanel/public/User';
import { UserLoadUserBy } from '../../model/user';
import { UserDomain } from '../../modules/organization-management/user/user-domain/user.domain';
import { AuthHelper } from '../../modules/security-management/capability/auth.helper';

// Structural on purpose: the SSE context is only { user, req }, not a full PortalContext
export interface GuardedContext {
  user?: UserLoadUserBy | null;
}

export type Principal =
  | { kind: 'anonymous' }
  | {
      kind: 'user';
      actorId: UserId;
      isPlatformAdmin: boolean;
      portalCapabilities: Set<PortalCapability>;
      selectedOrganizationId: OrganizationId;
    };

// Shared by every @Public() call: frozen so no caller can alter it for the next one
export const ANONYMOUS_PRINCIPAL: Readonly<{ kind: 'anonymous' }> =
  Object.freeze({ kind: 'anonymous' });

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
    isPlatformAdmin: AuthHelper.userHasBypassCapability(user),
    portalCapabilities: new Set(
      user.capabilities.map(({ name }) => name as PortalCapability)
    ),
    selectedOrganizationId: user.selected_organization_id,
  };
};
