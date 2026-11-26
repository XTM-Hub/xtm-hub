import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user/user-pending/user-organization-pending.domain';

/**
 * Shared membership invariant checks (last-member and pending-users
 * thresholds) for organization deletion flows, kept in one place so every
 * caller enforces the same rules and can't drift from one another.
 */

export const organizationWouldLoseLastMember = async (
  organizationId: OrganizationId
): Promise<boolean> => {
  const linkedUserCount =
    await UserOrganizationDomain.countUsersInOrganization(organizationId);
  return linkedUserCount <= 1;
};

// Locks the organization's membership rows so a concurrent request
// affecting the same organization (e.g. another user deletion) blocks
// until this transaction commits, closing the check-then-act race on the
// membership-count invariants above. Call from within `withTransaction`,
// immediately before re-validating and before the destructive operation.
export const lockOrganizationMembership = async (
  organizationId: OrganizationId
): Promise<void> => {
  await UserOrganizationDomain.lockOrganizationMembers(organizationId);
};

export const assertOrganizationHasNoPendingUsers = async (
  organizationId: OrganizationId,
  blockedErrorCode: string
): Promise<void> => {
  const pendingUserCount =
    await UserOrganizationPendingDomain.countPendingUsersInOrganization(
      organizationId
    );
  if (pendingUserCount > 0) {
    throw new Error(blockedErrorCode);
  }
};
