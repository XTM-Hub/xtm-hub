import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  OrganizationCapability,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { UserId } from '../../../model/kanel/public/User';
import * as pub from '../../../pub';
import * as sessionStoreManager from '../../../session-store-manager';
import { ErrorCode, NotFoundErrorCode } from '../../../utils/error/error.code';
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

  describe('updateAndDispatchUser', () => {
    it('should refresh the session with the selected organization capabilities and dispatch the user', async () => {
      // Given
      const updateUserSessionSpy = vi
        .spyOn(sessionStoreManager, 'updateUserSession')
        .mockResolvedValue();
      const dispatchSpy = vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const adminOrgaId =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID;

      // When
      await UserHelper.updateAndDispatchUser(adminOrgaId);

      // Then
      expect(updateUserSessionSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: adminOrgaId,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          selected_org_capabilities: [
            OrganizationCapability.AdministrateOrganization,
          ],
        })
      );
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

  describe('updateUserOrgCapabilitiesAndDispatch', () => {
    it('should refresh the session with the new selected organization capabilities', async () => {
      // Given
      requestContext.set(requestContextAdminSecondOrga);
      const updateUserSessionSpy = vi
        .spyOn(sessionStoreManager, 'updateUserSession')
        .mockResolvedValue();
      vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const simpleUserId =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID;

      // When
      await UserHelper.updateUserOrgCapabilitiesAndDispatch({
        user_id: simpleUserId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [OrganizationCapability.ManageAccess],
      });

      // Then
      expect(updateUserSessionSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          id: simpleUserId,
          selected_org_capabilities: [OrganizationCapability.ManageAccess],
          capabilities: expect.any(Array),
        })
      );
    });
  });

  describe('refreshUserSessions', () => {
    it('should destroy the sessions of a disabled user instead of updating them', async () => {
      // Given
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
      vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValue(
        new Error(ErrorCode.UserDisabled)
      );
      const updateUserSessionSpy = vi
        .spyOn(sessionStoreManager, 'updateUserSession')
        .mockResolvedValue();
      const destroyUserSessionsSpy = vi
        .spyOn(sessionStoreManager, 'destroyUserSessions')
        .mockResolvedValue();

      // When
      await UserHelper.refreshUserSessions(userId);

      // Then
      expect(destroyUserSessionsSpy).toHaveBeenCalledExactlyOnceWith(userId);
      expect(updateUserSessionSpy).not.toHaveBeenCalled();
    });

    it('should leave the sessions alone when the user does not exist', async () => {
      // Given
      const updateUserSessionSpy = vi
        .spyOn(sessionStoreManager, 'updateUserSession')
        .mockResolvedValue();

      // When
      await UserHelper.refreshUserSessions(
        '00000000-0000-0000-0000-000000000000' as UserId
      );

      // Then
      expect(updateUserSessionSpy).not.toHaveBeenCalled();
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
