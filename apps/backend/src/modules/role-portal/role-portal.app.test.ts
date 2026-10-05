import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { ErrorCode } from '../../utils/error/error.code';
import { RolePortalApp } from './role-portal.app';

const ROLE_NAME = 'PANCAKE_FLIPPER';
const SSO_GROUP = 'breakfast-club';

describe('role portal app tests', () => {
  describe('addSSOGroupRolePortal', () => {
    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
    });

    it('should create the role, link it to the SSO group and grant capabilities', async () => {
      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [PortalCapability.Bypass],
      });

      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({
          name: ROLE_NAME,
          capabilities: [expect.objectContaining(CAPABILITY_BYPASS)],
        }),
      });
      const rolePortal = await TestHelper.rolePortal.load({ name: ROLE_NAME });
      expect(rolePortal).toBeDefined();
    });

    it('should reuse an existing role and not duplicate capability links', async () => {
      const existingRole = await TestHelper.rolePortal.create({
        name: ROLE_NAME,
      });

      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [PortalCapability.Bypass, PortalCapability.Bypass],
      });
      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [PortalCapability.Bypass],
      });

      expect(result.rolePortal.id).toBe(existingRole.id);
      const capabilityLinks =
        await TestHelper.rolePortal_CapabilityPortal.loadAll({
          role_portal_id: existingRole.id,
        });
      expect(
        capabilityLinks.map(({ capability_portal_id }) => capability_portal_id)
      ).toEqual([CAPABILITY_BYPASS.id]);
    });

    it('should accept a role without capabilities', async () => {
      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [],
      });

      expect(result.rolePortal.capabilities).toEqual([]);
    });

    it('should throw and create nothing when a capability does not exist', async () => {
      await expect(
        RolePortalApp.addSSOGroupRolePortal({
          ssoGroup: SSO_GROUP,
          rolePortal: ROLE_NAME,
          capabilities: [
            PortalCapability.Bypass,
            'UNKNOWN_CAPABILITY' as PortalCapability,
          ],
        })
      ).rejects.toThrow(ErrorCode.CapabilityPortalNotFound);

      const rolePortal = await TestHelper.rolePortal.load({ name: ROLE_NAME });
      expect(rolePortal).toBeUndefined();
    });

    it('should throw when the SSO group or the role is blank', async () => {
      await expect(
        RolePortalApp.addSSOGroupRolePortal({
          ssoGroup: '  ',
          rolePortal: ROLE_NAME,
          capabilities: [],
        })
      ).rejects.toThrow(ErrorCode.InvalidSSOGroupRolePortal);
      await expect(
        RolePortalApp.addSSOGroupRolePortal({
          ssoGroup: SSO_GROUP,
          rolePortal: '',
          capabilities: [],
        })
      ).rejects.toThrow(ErrorCode.InvalidSSOGroupRolePortal);
    });
  });
});
