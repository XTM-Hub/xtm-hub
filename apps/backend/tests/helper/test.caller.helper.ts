import CapabilityPortal from '../../src/model/kanel/public/CapabilityPortal';
import Organization from '../../src/model/kanel/public/Organization';
import User from '../../src/model/kanel/public/User';
import { UserLoadUserBy } from '../../src/model/user';

// A request-context user member of the given organizations. The restriction reads organization_capabilities only:
// organizations is filled for narrowUserToToken, which filters both
const build = (
  user: User,
  memberOf: Organization[],
  capabilities: CapabilityPortal[] = []
): UserLoadUserBy => ({
  ...user,
  organizations: memberOf,
  selected_org_capabilities: [],
  roles_portal: [],
  capabilities,
  organization_capabilities: memberOf.map((organization) => ({
    id: `${user.id}-${organization.id}`,
    organization,
    capabilities: [],
  })),
});

export const TestCallerHelper = {
  caller: {
    build,
  },
};
