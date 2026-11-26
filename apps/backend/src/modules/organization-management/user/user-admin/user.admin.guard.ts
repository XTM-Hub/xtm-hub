import { OrganizationId } from '../../../../model/kanel/public/Organization';
import { UserId } from '../../../../model/kanel/public/User';
import { ErrorCode } from '../../../../utils/error/error.code';
import { DeploymentRequestDomain } from '../../../deployment/deployment.domain';
import { PlatformConfigurationDomain } from '../../../registration/platform-configuration/platform-configuration.domain';
import {
  assertOrganizationHasNoPendingUsers,
  lockOrganizationMembership,
  organizationWouldLoseLastMember,
} from '../../organization/organization-membership.util';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserTransferRequestDomain } from '../user-transferRequest/user-transfer-request.domain';
import { isUserLastOrganizationAdministrator } from '../user.helper';

// Non-personal-space organizations the user belongs to, used to
// re-validate the membership invariants below both before and, more
// strictly, inside the deletion transaction.
const loadSharedOrganizations = async (userId: UserId) => {
  const linkedOrganizations =
    await OrganizationDomain.loadOrganizationsByUser(userId);
  return linkedOrganizations.filter(
    (organization) => !organization.personal_space
  );
};

export const UserAdminGuard = {
  assertUserHasNoTransferRequest: async (userId: UserId) => {
    const transferRequestCount =
      await UserTransferRequestDomain.countTransferRequestsForUser(userId);
    if (transferRequestCount > 0) {
      throw new Error(ErrorCode.DeleteUserBlockedByTransferRequest);
    }
  },

  assertUserHasNoDeploymentRequest: async (userId: UserId) => {
    const deploymentRequestCount =
      await DeploymentRequestDomain.countDeploymentRequestsBy({
        user_requester_id: userId,
      });
    if (deploymentRequestCount > 0) {
      throw new Error(ErrorCode.DeleteUserBlockedByDeploymentRequest);
    }
  },

  assertUserHasNoCancellationRecord: async (userId: UserId) => {
    const cancellationRecordCount =
      await DeploymentRequestDomain.countDeploymentRequestsBy({
        cancellation_user_id: userId,
      });
    if (cancellationRecordCount > 0) {
      throw new Error(ErrorCode.DeleteUserBlockedByCancellationRecord);
    }
  },

  assertUserHasNoPlatformRegistration: async (userId: UserId) => {
    const platformRegistrationCount =
      await PlatformConfigurationDomain.countConfigurationsByRegisterer(userId);
    if (platformRegistrationCount > 0) {
      throw new Error(ErrorCode.DeleteUserBlockedByPlatformRegistration);
    }
  },

  assertUserIsNotLastOrganizationMember: async (userId: UserId) => {
    const sharedOrganizations = await loadSharedOrganizations(userId);

    for (const organization of sharedOrganizations) {
      if (await organizationWouldLoseLastMember(organization.id)) {
        throw new Error(ErrorCode.DeleteUserBlockedByLastOrganizationMember);
      }
    }
  },

  assertUserIsNotLastOrganizationAdministrator: async (userId: UserId) => {
    const sharedOrganizations = await loadSharedOrganizations(userId);

    for (const organization of sharedOrganizations) {
      if (await isUserLastOrganizationAdministrator(userId, organization.id)) {
        throw new Error(ErrorCode.CantRemoveLastAdministrator);
      }
    }
  },

  assertPersonalSpaceHasNoPendingUsers: async (
    personalSpaceId: OrganizationId
  ) => {
    await assertOrganizationHasNoPendingUsers(
      personalSpaceId,
      ErrorCode.DeleteUserBlockedByPendingUsers
    );
  },

  // Re-validates the invariants that have no database constraint backing.
  // Must run inside the deletion transaction, right before the destructive
  // operations, and after locking the relevant organizations' membership
  // rows so a concurrent request touching the same organization(s) is
  // serialized behind this one. This closes the check-then-act race window
  // between the early (pre-transaction) asserts above and the actual
  // deletion.
  relockAndRevalidateDeletionInvariants: async (
    userId: UserId,
    personalSpaceId: OrganizationId
  ) => {
    const sharedOrganizations = await loadSharedOrganizations(userId);

    for (const organization of sharedOrganizations) {
      await lockOrganizationMembership(organization.id);
      if (await organizationWouldLoseLastMember(organization.id)) {
        throw new Error(ErrorCode.DeleteUserBlockedByLastOrganizationMember);
      }
      if (await isUserLastOrganizationAdministrator(userId, organization.id)) {
        throw new Error(ErrorCode.CantRemoveLastAdministrator);
      }
    }

    await UserAdminGuard.assertPersonalSpaceHasNoPendingUsers(personalSpaceId);
  },
};
