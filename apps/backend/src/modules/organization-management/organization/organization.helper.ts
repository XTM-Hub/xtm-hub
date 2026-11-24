import { OrganizationId } from '../../../model/kanel/public/Organization';
import User from '../../../model/kanel/public/User';

// Each page is one query: the size a caller asks for is bounded so it cannot make it list every member at once.
const ORGANIZATION_MEMBERS_MAX_PAGE_SIZE = 100;

export const OrganizationHelper = {
  personalSpaceIdOf: (user: Pick<User, 'id'>) =>
    user.id as unknown as OrganizationId,

  // 0 is a valid page size: no member, but the totalCount. A negative one is brought to 0
  boundMembersPageSize: (first: number): number =>
    Math.min(Math.max(0, first), ORGANIZATION_MEMBERS_MAX_PAGE_SIZE),
};
