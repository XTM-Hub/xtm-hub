import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../knexfile';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import { RolePortalId } from '../../model/kanel/public/RolePortal';
import { UserId } from '../../model/kanel/public/User';
import { RolePortalDomain } from './role-portal.domain';

describe('role portal domain tests', () => {
  describe('loadRolePortalsBySSOGroups', () => {
    beforeEach(async () => {
      // eslint-disable-next-line no-restricted-syntax
      await db('SSOGroup_RolePortal').del();
      await TestHelper.rolePortal.delete({});
      await TestHelper.rolePortal.create({
        name: 'POTATO_PEELER',
      });
      await TestHelper.rolePortal.create({
        name: 'UNICORN_RIDER',
      });
      await TestHelper.rolePortal.create({
        name: 'BANANA_INSPECTOR',
      });

      // eslint-disable-next-line no-restricted-syntax
      await db('SSOGroup_RolePortal').insert([
        { SSOGroup: 'purple-elephants-club', RolePortal: 'POTATO_PEELER' },
        { SSOGroup: 'flying-pizza-society', RolePortal: 'POTATO_PEELER' },
        { SSOGroup: 'moonlight-dancers', RolePortal: 'UNICORN_RIDER' },
        {
          SSOGroup: 'coffee-addicts-anonymous',
          RolePortal: 'BANANA_INSPECTOR',
        },
      ]);
    });

    it('should return null when user has no SSO group', async () => {
      const result = await RolePortalDomain.loadRolePortalsBySSOGroups([]);

      expect(result?.roles).toBeNull();
    });

    it('should return role when user has a single SSO group', async () => {
      const result = await RolePortalDomain.loadRolePortalsBySSOGroups([
        'moonlight-dancers',
      ]);

      expect(result?.roles).toEqual(['UNICORN_RIDER']);
    });

    it('should avoid duplication when user has multiple SSO groups with same role', async () => {
      const result = await RolePortalDomain.loadRolePortalsBySSOGroups([
        'purple-elephants-club',
        'flying-pizza-society',
      ]);

      expect(result?.roles).toEqual(['POTATO_PEELER']);
      expect(result?.roles).toHaveLength(1);
    });
  });

  describe('assignRoleByName', () => {
    const testUserIds: string[] = [];
    const testRolePortalIds: string[] = [];
    let user_id: UserId;

    beforeEach(async () => {
      user_id = uuidv4() as UserId;
      testUserIds.push(user_id);

      await TestHelper.user.create({
        id: user_id,
        email: `add-role-${user_id}@test-dev.com`,
        salt: 'test-salt',
        password: 'test-password',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
    });

    afterEach(async () => {
      if (testUserIds.length > 0) {
        for (const testUserId of testUserIds) {
          await TestHelper.user_RolePortal.delete({
            user_id: testUserId as UserId,
          });
          await TestHelper.user.delete({ id: testUserId as UserId });
        }
      }

      if (testRolePortalIds.length > 0) {
        for (const testRolePortalId of testRolePortalIds) {
          await TestHelper.rolePortal.delete({
            id: testRolePortalId as RolePortalId,
          });
        }
      }

      testUserIds.length = 0;
      testRolePortalIds.length = 0;
    });

    it('should add role to user when role exists and user does not have it', async () => {
      // Given
      const rolePortalId = uuidv4() as RolePortalId;
      const roleName = `test-admin-${rolePortalId}`;

      testRolePortalIds.push(rolePortalId);

      await TestHelper.rolePortal.create({
        id: rolePortalId,
        name: roleName,
      });

      // When
      await RolePortalDomain.assignRoleByName(user_id, roleName);

      // Then
      const userRole = await TestHelper.user_RolePortal.load({
        user_id,
        role_portal_id: rolePortalId,
      });

      expect(userRole).toMatchObject({
        user_id,
        role_portal_id: rolePortalId,
      });
    });

    it('should not duplicate role if user already has it', async () => {
      // Given
      const rolePortalId = uuidv4() as RolePortalId;

      testRolePortalIds.push(rolePortalId);

      await TestHelper.rolePortal.create({
        id: rolePortalId,
        name: `test-editor-${rolePortalId}`,
      });

      // When
      await RolePortalDomain.assignRoleByName(
        user_id,
        `test-editor-${rolePortalId}`
      );
      await RolePortalDomain.assignRoleByName(
        user_id,
        `test-editor-${rolePortalId}`
      );

      // Then
      const userRoles = await TestHelper.user_RolePortal.loadAll({
        user_id,
        role_portal_id: rolePortalId,
      });

      expect(userRoles).toHaveLength(1);
      expect(userRoles[0]).toMatchObject({
        user_id,
        role_portal_id: rolePortalId,
      });
    });

    it('should handle when role does not exist', async () => {
      // Given

      // When
      await expect(
        RolePortalDomain.assignRoleByName(user_id, 'non-existent-role')
      ).resolves.not.toThrow();

      // Then
      const userRoles = await TestHelper.user_RolePortal.loadAll({
        user_id,
      });

      expect(userRoles).toHaveLength(0);
    });

    it('should work with existing role names in database', async () => {
      // Given
      const existingRole = await TestHelper.rolePortal.load({});

      // When
      if (existingRole) {
        await RolePortalDomain.assignRoleByName(user_id, existingRole.name);

        // Then
        const userRole = await TestHelper.user_RolePortal.load({
          user_id,
          role_portal_id: existingRole.id,
        });

        expect(userRole).toMatchObject({
          user_id,
          role_portal_id: existingRole.id,
        });
      }
    });
  });
});
