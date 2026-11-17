import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import { allow, deny, forCaller, Guard } from '../guard.types';
import { Principal } from '../principal';

type UserCaller = Extract<Principal, { kind: 'user' }>;

type OrganizationSource = (user: UserCaller) => OrganizationId;

export const selectedOrganization: OrganizationSource = (user) =>
  user.selectedOrganizationId;

export const orgGuard = ({
  organization,
  capabilities,
}: {
  organization: OrganizationSource;
  capabilities: readonly OrganizationCapability[];
}): Guard =>
  forCaller('user', (user) => {
    if (user.isBypassUser) {
      return allow();
    }
    const organizationId = organization(user);
    const membership = user.memberships.find(
      ({ organization: { id } }) => id === organizationId
    );
    if (!membership) {
      return deny(NotFoundErrorCode.NotFound);
    }
    const allowed =
      capabilities.length === 0 ||
      capabilities.some((requiredCapability) =>
        AuthHelper.isUserAllowed({
          requiredCapability,
          organizationCapabilities: membership.capabilities,
        })
      );
    return allowed
      ? allow()
      : deny(ForbiddenErrorCode.MissingCapabilityOnOrganization);
  });
