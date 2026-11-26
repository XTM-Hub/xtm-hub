import { OrganizationId } from '../../../model/kanel/public/Organization';
import User from '../../../model/kanel/public/User';

const ORGANIZATION_MEMBERS_MAX_PAGE_SIZE = 100;

export const OrganizationHelper = {
  personalSpaceIdOf: (user: Pick<User, 'id'>) =>
    user.id as unknown as OrganizationId,

  // 0 is a valid page size: no member, but the totalCount
  boundMembersPageSize: (first: number): number =>
    Math.min(Math.max(0, first), ORGANIZATION_MEMBERS_MAX_PAGE_SIZE),
};
