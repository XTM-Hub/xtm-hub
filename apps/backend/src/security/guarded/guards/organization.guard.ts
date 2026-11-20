import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import { allow, deny, forCaller, TargetedGuard } from '../guard.types';
import { Source } from '../sources';

export const selectedOrganization: Source<unknown, OrganizationId> = (user) =>
  user.selectedOrganizationId;

export const orgGuard = <Args = unknown>({
  organization,
  capabilities,
}: {
  organization: Source<Args, OrganizationId>;
  capabilities: readonly OrganizationCapability[];
}): TargetedGuard<Args> =>
  forCaller<'user', Args>('user', (user, args) => {
    if (user.isBypassUser) {
      return allow({ kind: 'admin' });
    }
    const organizationId = organization(user, args);
    const membership = user.memberships.find(
      ({ organization: { id } }) => id === organizationId
    );
    if (!organizationId || !membership) {
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
      ? allow({ kind: 'organization', organizationId })
      : deny(ForbiddenErrorCode.MissingCapabilityOnOrganization);
  });
