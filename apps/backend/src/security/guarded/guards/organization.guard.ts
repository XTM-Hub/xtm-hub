import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { AuthHelper } from '../../../modules/security-management/capability/auth.helper';
import {
  ForbiddenErrorCode,
  NotFoundErrorCode,
} from '../../../utils/error/error.code';
import { allow, deny, forCaller, TargetedGuard } from '../guard.types';
import { AsyncSource, Source } from '../sources';

export const selectedOrganization: Source<unknown, OrganizationId> = (user) =>
  user.selectedOrganizationId;

// `bypass: false` makes a BYPASS user a member like any other: for an operation that acts as a member of the
// organization, whatever the platform rights
export const orgGuard = <Args = unknown>({
  organization,
  capabilities,
  bypass = true,
}: {
  organization:
    Source<Args, OrganizationId> | AsyncSource<Args, OrganizationId>;
  capabilities: readonly OrganizationCapability[];
  bypass?: boolean;
}): TargetedGuard<Args> =>
  forCaller<'user', Args>('user', async (user, args) => {
    if (bypass && user.isBypassUser) {
      return allow({ kind: 'admin' });
    }
    const organizationId = await organization(user, args);
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
