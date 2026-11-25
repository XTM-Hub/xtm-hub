import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  requestContextAdminSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import { OrganizationCapability } from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import { CAPABILITY_BYPASS, ROLE_ADMIN } from '../../../../portal.const';
import * as pub from '../../../../pub';
import { UserDomain } from '../user-domain/user.domain';
import { UserHelper } from '../user.helper';
import {
  USER_SESSIONS_LOCK_NAMESPACE,
  UserSessionHelper,
} from './user-session.helper';

describe('userSessionHelper', () => {
  describe('updateUserSession', () => {
    const createdUserIds: UserId[] = [];
    const createdSessionIds: string[] = [];

    const insertUser = async (fields: { disabled?: boolean } = {}) => {
      const user = await TestHelper.user.insert({
        email: `session-reload-${uuidv4()}@filigran.io`,
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        ...fields,
      });
      createdUserIds.push(user.id);
      return user;
    };

    const createSession = async (userId: UserId) => {
      const sessionId = await TestHelper.session.create({
        // Stale snapshot, as left by a capability change before the fix
        user: {
          id: userId,
          selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        } as UserLoadUserBy,
      });
      createdSessionIds.push(sessionId);
      return sessionId;
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

    it('should store the selected organization and portal capabilities of the user when the user has an active session', async () => {
      // Given
      const user = await insertUser();
      const userOrganization = await TestHelper.user_Organization.create({
        user_id: user.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      await TestHelper.user_OrganizationCapability.create({
        user_organization_id: userOrganization!.id,
        name: OrganizationCapability.ManageAccess,
      });
      await TestHelper.user_RolePortal.create({
        user_id: user.id,
        role_portal_id: ROLE_ADMIN.id,
      });
      const sessionId = await createSession(user.id);

      // When
      await UserSessionHelper.updateUserSession(user.id);

      // Then
      const session = await TestHelper.session.load(sessionId);
      expect(session?.user).toMatchObject({
        id: user.id,
        selected_organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        selected_org_capabilities: [OrganizationCapability.ManageAccess],
        capabilities: [
          { id: CAPABILITY_BYPASS.id, name: CAPABILITY_BYPASS.name },
        ],
      });
    });

    it.each([
      {
        reason: 'the user is disabled',
        createUserId: async () => (await insertUser({ disabled: true })).id,
      },
      {
        reason: 'the user no longer exists',
        createUserId: async () => uuidv4() as UserId,
      },
    ])(
      'should destroy the sessions of the user when $reason',
      async ({ createUserId }) => {
        // Given
        const userId = await createUserId();
        const sessionId = await createSession(userId);

        // When
        await UserSessionHelper.updateUserSession(userId);

        // Then
        expect(await TestHelper.session.load(sessionId)).toBeNull();
      }
    );

    it('should not re-insert a session destroyed while the user is reloaded', async () => {
      // Given
      const user = await insertUser();
      const sessionId = await createSession(user.id);
      const loadUserBy = UserDomain.loadUserBy;
      vi.spyOn(UserDomain, 'loadUserBy').mockImplementationOnce(
        async (filter) => {
          // A logout, or an admin disabling the user, lands meanwhile
          await TestHelper.session.delete(sessionId);
          return loadUserBy(filter);
        }
      );

      // When
      await UserSessionHelper.updateUserSession(user.id);

      // Then
      expect(await TestHelper.session.load(sessionId)).toBeNull();
    });

    it('should keep the sessions of the user unchanged when the user cannot be reloaded', async () => {
      // Given
      const user = await insertUser();
      const sessionId = await createSession(user.id);
      const sessionBefore = await TestHelper.session.load(sessionId);
      vi.spyOn(UserDomain, 'loadUserBy').mockRejectedValueOnce(
        new Error('database unavailable')
      );

      // When
      await UserSessionHelper.updateUserSession(user.id);

      // Then
      expect(await TestHelper.session.load(sessionId)).toStrictEqual(
        sessionBefore
      );
    });

    it('should not reload the user when the user has no active session', async () => {
      // Given
      const user = await insertUser();
      const loadUserBySpy = vi.spyOn(UserDomain, 'loadUserBy');

      // When
      await UserSessionHelper.updateUserSession(user.id);

      // Then
      expect(loadUserBySpy).not.toHaveBeenCalled();
    });

    it('should not let a refresh that reloaded the user before a revocation overwrite the refresh that follows it', async () => {
      // Given
      vi.spyOn(pub, 'dispatch').mockResolvedValue();
      const user = await insertUser();
      const userOrganization = await TestHelper.user_Organization.create({
        user_id: user.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      await TestHelper.user_OrganizationCapability.create({
        user_organization_id: userOrganization!.id,
        name: OrganizationCapability.ManageAccess,
      });
      const sessionId = await createSession(user.id);
      // A first refresh reloads the user, still with MANAGE_ACCESS, then stalls before writing
      let signalReloaded!: () => void;
      const reloaded = new Promise<void>((resolve) => {
        signalReloaded = resolve;
      });
      let resumeFirstRefresh!: () => void;
      const firstRefreshResumed = new Promise<void>((resolve) => {
        resumeFirstRefresh = resolve;
      });
      const loadUserBy = UserDomain.loadUserBy;
      vi.spyOn(UserDomain, 'loadUserBy').mockImplementationOnce(
        async (filter) => {
          const staleUser = await loadUserBy(filter);
          signalReloaded();
          await firstRefreshResumed;
          return staleUser;
        }
      );
      const firstRefresh = UserSessionHelper.updateUserSession(user.id);
      await reloaded;

      // When
      requestContext.set(requestContextAdminSecondOrga);
      const revocation = UserHelper.updateUserOrgCapabilitiesAndDispatch({
        user_id: user.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        orgCapabilities: [],
      });
      // The refresh of the revocation queues behind the lock of the first refresh. Without the
      // lock, nothing holds it back while the first refresh is stalled: the revocation completes
      await TestHelper.advisoryLock.waitForWaiter(
        USER_SESSIONS_LOCK_NAMESPACE,
        user.id,
        revocation
      );
      resumeFirstRefresh();
      await Promise.all([firstRefresh, revocation]);

      // Then
      const session = await TestHelper.session.load(sessionId);
      expect(session?.user).toMatchObject({
        id: user.id,
        selected_org_capabilities: [],
      });
    });

    it('should resolve when the user id is invalid', async () => {
      // Given
      const invalidUserId = null as unknown as UserId;

      // When
      const call = UserSessionHelper.updateUserSession(invalidUserId);

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });
});
