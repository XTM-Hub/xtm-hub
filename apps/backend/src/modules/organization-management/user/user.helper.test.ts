import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  OrganizationCapability,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import { UserId } from '../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../model/user';
import * as pub from '../../../pub';
import { NotFoundErrorCode } from '../../../utils/error/error.code';
import { UserDomain } from './user-domain/user.domain';
import { UserHelper } from './user.helper';

describe('userHelper', () => {
  describe('dispatchPendingDeletedForOrganizations', () => {
    it('should dispatch a UserPending delete event for each given organization', async () => {
      const user = await TestHelper.user.load({
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserHelper.dispatchPendingDeletedForOrganizations(user, [
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      ]);

      expect(dispatchSpy).toHaveBeenCalledTimes(2);
      expect(dispatchSpy).toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.objectContaining({
          id: user.id,
          pending_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        }),
        'User'
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        'UserPending',
        'delete',
        expect.objectContaining({
          id: user.id,
          pending_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        }),
        'User'
      );
    });

    it('should not dispatch anything when given an empty list of organizations', async () => {
      const user = await TestHelper.user.load({
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      const dispatchSpy = vi.spyOn(pub, 'dispatch');

      await UserHelper.dispatchPendingDeletedForOrganizations(user, []);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('acceptPendingUserWithCapabilities', () => {
    const createdUserIds: UserId[] = [];
    const createdSessionIds: string[] = [];

    // A pending user of SECOND_ORGANIZATION, with it selected and an active session
    const givenPendingUserWithSession = async () => {
      const user = await TestHelper.user.insert({
        email: `accept-pending-${uuidv4()}@filigran.io`,
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      createdUserIds.push(user.id);
      await TestHelper.user_OrganizationPending.create({
        user_id: user.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      const sessionId = await TestHelper.session.create({
        user: (await UserDomain.loadUserBy({ 'User.id': user.id }))!,
      });
      createdSessionIds.push(sessionId);
      return { user, sessionId };
    };

    const acceptWithManageAccess = (userId: UserId) => {
      // Granting capabilities is checked against the caller: an administrator of the organization
      requestContext.set(requestContextAdminSecondOrga);
      return UserHelper.acceptPendingUserWithCapabilities({
        user_id: userId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [OrganizationCapability.ManageAccess],
      });
    };

    afterEach(async () => {
      vi.restoreAllMocks();
      await Promise.all(
        createdSessionIds.splice(0).map(TestHelper.session.delete)
      );
      await Promise.all(
        createdUserIds.splice(0).map((id) => UserHelper.removeUser({ id }))
      );
    });

    it('should refresh the sessions of the user only once the outermost transaction commits', async () => {
      // Given
      vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const { user, sessionId } = await givenPendingUserWithSession();
      const sessionBefore = await TestHelper.session.load(sessionId);
      let sessionBeforeCommit: Awaited<
        ReturnType<typeof TestHelper.session.load>
      > = null;

      // When
      await withTransaction(async () => {
        await acceptWithManageAccess(user.id);
        sessionBeforeCommit = await TestHelper.session.load(sessionId);
      });

      // Then
      expect(sessionBeforeCommit).toStrictEqual(sessionBefore);
      const session = await TestHelper.session.load(sessionId);
      expect(session?.user).toMatchObject({
        id: user.id,
        selected_org_capabilities: [OrganizationCapability.ManageAccess],
      });
    });

    it('should leave the sessions of the user unchanged when the outermost transaction rolls back', async () => {
      // Given
      vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const { user, sessionId } = await givenPendingUserWithSession();
      const sessionBefore = await TestHelper.session.load(sessionId);

      // When
      const call = withTransaction(async () => {
        await acceptWithManageAccess(user.id);
        throw new Error('rolled back');
      });

      // Then
      await expect(call).rejects.toThrow('rolled back');
      expect(await TestHelper.session.load(sessionId)).toStrictEqual(
        sessionBefore
      );
    });

    it('should notify the user only after the commit, once its sessions are refreshed', async () => {
      // Given
      const { user, sessionId } = await givenPendingUserWithSession();
      let sessionWhenNotified: Awaited<
        ReturnType<typeof TestHelper.session.load>
      > = null;
      const dispatchSpy = vi
        .spyOn(pub, 'dispatch')
        .mockImplementation(async (type) => {
          if (type === 'MeUser') {
            sessionWhenNotified = await TestHelper.session.load(sessionId);
          }
        });
      let dispatchedBeforeCommit = false;

      // When
      await withTransaction(async () => {
        await acceptWithManageAccess(user.id);
        dispatchedBeforeCommit = dispatchSpy.mock.calls.length > 0;
      });

      // Then
      expect(dispatchedBeforeCommit).toBe(false);
      expect(dispatchSpy).toHaveBeenCalledWith(
        'MeUser',
        'edit',
        expect.objectContaining({ id: user.id }),
        'User'
      );
      expect(sessionWhenNotified?.user).toMatchObject({
        id: user.id,
        selected_org_capabilities: [OrganizationCapability.ManageAccess],
      });
    });

    it('should not notify anyone when the outermost transaction rolls back', async () => {
      // Given
      const dispatchSpy = vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const { user } = await givenPendingUserWithSession();

      // When
      const call = withTransaction(async () => {
        await acceptWithManageAccess(user.id);
        throw new Error('rolled back');
      });

      // Then
      await expect(call).rejects.toThrow('rolled back');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('updateAndDispatchUser', () => {
    it('should refresh the session with the selected organization capabilities and dispatch the user', async () => {
      // Given
      const dispatchSpy = vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const adminOrgaId =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID;
      const sessionId = await TestHelper.session.create({
        // Stale snapshot, without the selected organization capabilities
        user: { id: adminOrgaId } as UserLoadUserBy,
      });

      // When
      await UserHelper.updateAndDispatchUser(adminOrgaId);

      // Then
      const session = await TestHelper.session.load(sessionId);
      await TestHelper.session.delete(sessionId);
      expect(session?.user).toMatchObject({
        id: adminOrgaId,
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        selected_org_capabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
        capabilities: expect.any(Array),
      });
      expect(dispatchSpy).toHaveBeenCalledExactlyOnceWith(
        'User',
        'edit',
        expect.objectContaining({ id: adminOrgaId })
      );
    });

    it('should throw UserNotFound when the user does not exist', async () => {
      // Given
      const unknownUserId = '00000000-0000-0000-0000-000000000000' as UserId;

      // When
      const call = UserHelper.updateAndDispatchUser(unknownUserId);

      // Then
      await expect(call).rejects.toThrow(NotFoundErrorCode.UserNotFound);
    });
  });

  describe('hasAuth0Account', () => {
    it.each([
      { status: null, expected: true },
      { status: UserAccountStatus.Invited, expected: true },
      { status: UserAccountStatus.Waiting, expected: false },
      { status: UserAccountStatus.Expired, expected: false },
    ])(
      'should return $expected when the user status is $status',
      ({ status, expected }) => {
        expect(UserHelper.hasAuth0Account({ status })).toBe(expected);
      }
    );
  });
});
