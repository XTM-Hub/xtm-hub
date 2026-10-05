import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS } from '../../portal.const';
import { ErrorCode } from '../../utils/error/error.code';
import { RolePortalApp } from './role-portal.app';
import { RolePortalDomain } from './role-portal.domain';

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

  describe('updateSSOGroupRolePortal', () => {
    const OTHER_ROLE_NAME = 'WAFFLE_MAKER';
    const NEW_ROLE_NAME = 'CREPE_MASTER';
    const OTHER_SSO_GROUP = 'brunch-club';

    const loadRoleCapabilityNames = async (rolePortalName: string) => {
      const [mapping] = await RolePortalDomain.loadSSOGroupRolePortals({
        rolePortalName,
      });
      return (mapping?.rolePortal.capabilities ?? [])
        .map((capability) => capability?.name)
        .sort();
    };

    beforeEach(async () => {
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [PortalCapability.Bypass],
      });
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: OTHER_SSO_GROUP,
        rolePortal: ROLE_NAME,
        capabilities: [],
      });
      await TestHelper.rolePortal.create({ name: OTHER_ROLE_NAME });
    });

    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: OTHER_ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: NEW_ROLE_NAME });
    });

    it('should move the SSO group to another role, set its capabilities and leave the previous role untouched', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        {
          ssoGroup: SSO_GROUP,
          rolePortal: OTHER_ROLE_NAME,
          capabilities: [PortalCapability.ReadTrials],
        }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({
          name: OTHER_ROLE_NAME,
          capabilities: [
            expect.objectContaining({ name: PortalCapability.ReadTrials }),
          ],
        }),
      });
      const [previousRoleMapping] =
        await RolePortalDomain.loadSSOGroupRolePortals({
          rolePortalName: ROLE_NAME,
        });
      expect(previousRoleMapping).toEqual({
        ssoGroup: OTHER_SSO_GROUP,
        rolePortal: expect.objectContaining({
          name: ROLE_NAME,
          capabilities: [expect.objectContaining(CAPABILITY_BYPASS)],
        }),
      });
    });

    it('should create the role with the given capabilities when it does not exist', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        {
          ssoGroup: SSO_GROUP,
          rolePortal: ` ${NEW_ROLE_NAME} `,
          capabilities: [PortalCapability.ReadTrials],
        }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({
          name: NEW_ROLE_NAME,
          capabilities: [
            expect.objectContaining({ name: PortalCapability.ReadTrials }),
          ],
        }),
      });
      expect(
        await TestHelper.rolePortal.load({ name: NEW_ROLE_NAME })
      ).toBeDefined();
      expect(await loadRoleCapabilityNames(ROLE_NAME)).toEqual([
        PortalCapability.Bypass,
      ]);
    });

    it('should replace the role capabilities for every SSO group mapped to it', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        {
          ssoGroup: SSO_GROUP,
          rolePortal: ROLE_NAME,
          capabilities: [
            PortalCapability.ReadTrials,
            PortalCapability.ReadTrials,
          ],
        }
      );

      // Then
      expect(result.rolePortal.capabilities).toEqual([
        expect.objectContaining({ name: PortalCapability.ReadTrials }),
      ]);
      const [otherMapping] = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: OTHER_SSO_GROUP,
      });
      expect(otherMapping?.rolePortal.capabilities).toEqual([
        expect.objectContaining({ name: PortalCapability.ReadTrials }),
      ]);
    });

    it('should remove every capability of the role when none is given', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME, capabilities: [] }
      );

      // Then
      expect(result.rolePortal.capabilities).toEqual([]);
    });

    it('should rename the SSO group and keep its role', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        {
          ssoGroup: '  dinner-club ',
          rolePortal: ROLE_NAME,
          capabilities: [PortalCapability.Bypass],
        }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: 'dinner-club',
        rolePortal: expect.objectContaining({
          name: ROLE_NAME,
          capabilities: [expect.objectContaining(CAPABILITY_BYPASS)],
        }),
      });
      const remaining = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: SSO_GROUP,
      });
      expect(remaining).toEqual([]);
    });

    it.each`
      description                            | current                                                | input                                                                                       | errorCode
      ${'the mapping does not exist'}        | ${{ ssoGroup: 'unknown-club', rolePortal: ROLE_NAME }} | ${{ ssoGroup: SSO_GROUP, rolePortal: NEW_ROLE_NAME, capabilities: [] }}                     | ${ErrorCode.SSOGroupRolePortalNotFound}
      ${'the target mapping already exists'} | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: OTHER_SSO_GROUP, rolePortal: ROLE_NAME, capabilities: [] }}                   | ${ErrorCode.SSOGroupRolePortalAlreadyExists}
      ${'a capability does not exist'}       | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: SSO_GROUP, rolePortal: NEW_ROLE_NAME, capabilities: ['UNKNOWN_CAPABILITY'] }} | ${ErrorCode.CapabilityPortalNotFound}
      ${'the SSO group is blank'}            | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: '  ', rolePortal: NEW_ROLE_NAME, capabilities: [] }}                          | ${ErrorCode.InvalidSSOGroupRolePortal}
    `(
      'should throw $errorCode and change nothing when $description',
      async ({ current, input, errorCode }) => {
        // When
        await expect(
          RolePortalApp.updateSSOGroupRolePortal(current, input)
        ).rejects.toThrow(errorCode);

        // Then
        const mappings = await RolePortalDomain.loadSSOGroupRolePortals({
          rolePortalName: ROLE_NAME,
        });
        expect(mappings.map(({ ssoGroup }) => ssoGroup).sort()).toEqual(
          [SSO_GROUP, OTHER_SSO_GROUP].sort()
        );
        expect(await loadRoleCapabilityNames(ROLE_NAME)).toEqual([
          PortalCapability.Bypass,
        ]);
        expect(
          await TestHelper.rolePortal.load({ name: NEW_ROLE_NAME })
        ).toBeUndefined();
      }
    );
  });
});
