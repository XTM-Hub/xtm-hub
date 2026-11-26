import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '../../../../utils/error/error.code';
import { DeploymentRequestDomain } from '../../../deployment/deployment.domain';
import { PlatformConfigurationDomain } from '../../../registration/platform-configuration/platform-configuration.domain';
import * as organizationMembershipUtil from '../../organization/organization-membership.util';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserTransferRequestDomain } from '../user-transferRequest/user-transfer-request.domain';
import * as userHelperModule from '../user.helper';
import { UserAdminGuard } from './user.admin.guard';

describe('userAdminGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when user has transfer requests', async () => {
    vi.spyOn(
      UserTransferRequestDomain,
      'countTransferRequestsForUser'
    ).mockResolvedValue(1);

    await expect(
      UserAdminGuard.assertUserHasNoTransferRequest(uuidv4())
    ).rejects.toThrow(ErrorCode.DeleteUserBlockedByTransferRequest);
  });

  it('should throw when user has deployment requests', async () => {
    vi.spyOn(
      DeploymentRequestDomain,
      'countDeploymentRequestsBy'
    ).mockResolvedValue(1);

    await expect(
      UserAdminGuard.assertUserHasNoDeploymentRequest(uuidv4())
    ).rejects.toThrow(ErrorCode.DeleteUserBlockedByDeploymentRequest);
  });

  it('should throw when user has platform registrations', async () => {
    vi.spyOn(
      PlatformConfigurationDomain,
      'countConfigurationsByRegisterer'
    ).mockResolvedValue(1);

    await expect(
      UserAdminGuard.assertUserHasNoPlatformRegistration(uuidv4())
    ).rejects.toThrow(ErrorCode.DeleteUserBlockedByPlatformRegistration);
  });

  it('should throw when user is the last member of a shared organization', async () => {
    const organizationId = uuidv4();
    vi.spyOn(OrganizationDomain, 'loadOrganizationsByUser').mockResolvedValue([
      { id: uuidv4(), personal_space: true },
      { id: organizationId, personal_space: false },
    ] as never);
    vi.spyOn(
      organizationMembershipUtil,
      'organizationWouldLoseLastMember'
    ).mockResolvedValueOnce(true);

    await expect(
      UserAdminGuard.assertUserIsNotLastOrganizationMember(uuidv4())
    ).rejects.toThrow(ErrorCode.DeleteUserBlockedByLastOrganizationMember);
  });

  it('should throw when user is the last administrator of a shared organization', async () => {
    const organizationId = uuidv4();
    const userId = uuidv4();
    vi.spyOn(OrganizationDomain, 'loadOrganizationsByUser').mockResolvedValue([
      { id: organizationId, personal_space: false },
    ] as never);
    vi.spyOn(
      userHelperModule,
      'isUserLastOrganizationAdministrator'
    ).mockResolvedValue(true);

    await expect(
      UserAdminGuard.assertUserIsNotLastOrganizationAdministrator(userId)
    ).rejects.toThrow(ErrorCode.CantRemoveLastAdministrator);
  });

  it('should lock and revalidate organizations before checking personal-space pending users', async () => {
    const organizationId = uuidv4();
    const userId = uuidv4();
    const personalSpaceId = uuidv4();
    const lockOrganizationMembershipSpy = vi
      .spyOn(organizationMembershipUtil, 'lockOrganizationMembership')
      .mockResolvedValue();
    vi.spyOn(OrganizationDomain, 'loadOrganizationsByUser').mockResolvedValue([
      { id: organizationId, personal_space: false },
    ] as never);
    vi.spyOn(
      organizationMembershipUtil,
      'organizationWouldLoseLastMember'
    ).mockResolvedValue(false);
    vi.spyOn(
      userHelperModule,
      'isUserLastOrganizationAdministrator'
    ).mockResolvedValue(false);
    const assertOrganizationHasNoPendingUsersSpy = vi
      .spyOn(organizationMembershipUtil, 'assertOrganizationHasNoPendingUsers')
      .mockResolvedValue();

    await expect(
      UserAdminGuard.relockAndRevalidateDeletionInvariants(
        userId,
        personalSpaceId
      )
    ).resolves.toBeUndefined();

    expect(lockOrganizationMembershipSpy).toHaveBeenCalledWith(organizationId);
    expect(assertOrganizationHasNoPendingUsersSpy).toHaveBeenCalledWith(
      personalSpaceId,
      ErrorCode.DeleteUserBlockedByPendingUsers
    );
  });
});
