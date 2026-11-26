import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PortalCapability } from '../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS, ROLE_ADMIN, ROLE_USER } from '../../portal.const';
import { ErrorCode } from '../../utils/error/error.code';
import { RolePortalApp } from './role-portal.app';
import { RolePortalDomain } from './role-portal.domain';

const ROLE_NAME = 'PANCAKE_FLIPPER';
const SSO_GROUP = 'breakfast-club';

const loadRoleCapabilityNames = async (name: string) => {
  const [rolePortal] = await RolePortalDomain.loadRolePortals({ name });
  return (rolePortal?.capabilities ?? [])
    .map((capability) => capability.name)
    .sort();
};

describe('role portal app tests', () => {
  describe('addSSOGroupRolePortal', () => {
    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
    });

    it('should create the role and link it to the SSO group', async () => {
      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
      });

      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({ name: ROLE_NAME }),
      });
      const rolePortal = await TestHelper.rolePortal.load({ name: ROLE_NAME });
      expect(rolePortal).toBeDefined();
    });

    it('should reuse an existing role', async () => {
      const existingRole = await TestHelper.rolePortal.create({
        name: ROLE_NAME,
      });

      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
      });

      expect(result.rolePortal.id).toBe(existingRole.id);
    });

    it('should reuse an existing role whatever the case of its name', async () => {
      const existingRole = await TestHelper.rolePortal.create({
        name: ROLE_NAME,
      });

      const result = await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME.toLowerCase(),
      });

      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({
          id: existingRole.id,
          name: ROLE_NAME,
        }),
      });
      expect(
        await TestHelper.rolePortal.load({ name: ROLE_NAME.toLowerCase() })
      ).toBeUndefined();
    });

    it('should throw when the SSO group or the role is blank', async () => {
      await expect(
        RolePortalApp.addSSOGroupRolePortal({
          ssoGroup: '  ',
          rolePortal: ROLE_NAME,
        })
      ).rejects.toThrow(ErrorCode.InvalidSSOGroupRolePortal);
      await expect(
        RolePortalApp.addSSOGroupRolePortal({
          ssoGroup: SSO_GROUP,
          rolePortal: '',
        })
      ).rejects.toThrow(ErrorCode.InvalidSSOGroupRolePortal);
    });
  });

  describe('updateSSOGroupRolePortal', () => {
    const OTHER_ROLE_NAME = 'WAFFLE_MAKER';
    const NEW_ROLE_NAME = 'CREPE_MASTER';
    const OTHER_SSO_GROUP = 'brunch-club';

    beforeEach(async () => {
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
      });
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: OTHER_SSO_GROUP,
        rolePortal: ROLE_NAME,
      });
      await TestHelper.rolePortal.create({ name: OTHER_ROLE_NAME });
    });

    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: OTHER_ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: NEW_ROLE_NAME });
    });

    it('should move the SSO group to another role and leave the previous role untouched', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        { ssoGroup: SSO_GROUP, rolePortal: OTHER_ROLE_NAME }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({ name: OTHER_ROLE_NAME }),
      });
      const previousRoleMappings =
        await RolePortalDomain.loadSSOGroupRolePortals({
          rolePortalName: ROLE_NAME,
        });
      expect(previousRoleMappings.map(({ ssoGroup }) => ssoGroup)).toEqual([
        OTHER_SSO_GROUP,
      ]);
    });

    it('should create the role when it does not exist', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        { ssoGroup: SSO_GROUP, rolePortal: ` ${NEW_ROLE_NAME} ` }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: SSO_GROUP,
        rolePortal: expect.objectContaining({ name: NEW_ROLE_NAME }),
      });
      expect(
        await TestHelper.rolePortal.load({ name: NEW_ROLE_NAME })
      ).toBeDefined();
    });

    it('should rename the SSO group and keep its role', async () => {
      // When
      const result = await RolePortalApp.updateSSOGroupRolePortal(
        { ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME },
        { ssoGroup: '  dinner-club ', rolePortal: ROLE_NAME }
      );

      // Then
      expect(result).toEqual({
        ssoGroup: 'dinner-club',
        rolePortal: expect.objectContaining({ name: ROLE_NAME }),
      });
      const remaining = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: SSO_GROUP,
      });
      expect(remaining).toEqual([]);
    });

    it.each`
      description                                            | current                                                | input                                                                 | errorCode
      ${'the mapping does not exist'}                        | ${{ ssoGroup: 'unknown-club', rolePortal: ROLE_NAME }} | ${{ ssoGroup: SSO_GROUP, rolePortal: NEW_ROLE_NAME }}                 | ${ErrorCode.SSOGroupRolePortalNotFound}
      ${'the target mapping already exists'}                 | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: OTHER_SSO_GROUP, rolePortal: ROLE_NAME }}               | ${ErrorCode.SSOGroupRolePortalAlreadyExists}
      ${'the target mapping already exists in another case'} | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: OTHER_SSO_GROUP, rolePortal: ROLE_NAME.toLowerCase() }} | ${ErrorCode.SSOGroupRolePortalAlreadyExists}
      ${'the SSO group is blank'}                            | ${{ ssoGroup: SSO_GROUP, rolePortal: ROLE_NAME }}      | ${{ ssoGroup: '  ', rolePortal: NEW_ROLE_NAME }}                      | ${ErrorCode.InvalidSSOGroupRolePortal}
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
        expect(
          await TestHelper.rolePortal.load({ name: NEW_ROLE_NAME })
        ).toBeUndefined();
      }
    );
  });

  describe('addRolePortal', () => {
    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
    });

    it('should create the role with its capabilities, without duplicates', async () => {
      // When
      const result = await RolePortalApp.addRolePortal({
        name: ` ${ROLE_NAME} `,
        capabilities: [PortalCapability.Bypass, PortalCapability.Bypass],
      });

      // Then
      expect(result).toEqual(
        expect.objectContaining({
          name: ROLE_NAME,
          capabilities: [expect.objectContaining(CAPABILITY_BYPASS)],
        })
      );
      const capabilityLinks =
        await TestHelper.rolePortal_CapabilityPortal.loadAll({
          role_portal_id: result.id,
        });
      expect(
        capabilityLinks.map(({ capability_portal_id }) => capability_portal_id)
      ).toEqual([CAPABILITY_BYPASS.id]);
    });

    it('should accept a role without capabilities', async () => {
      const result = await RolePortalApp.addRolePortal({
        name: ROLE_NAME,
        capabilities: [],
      });

      expect(result.capabilities).toEqual([]);
    });

    it.each`
      description                      | input                                                                                                     | errorCode
      ${'the role already exists'}     | ${{ name: ROLE_USER.name, capabilities: [] }}                                                             | ${ErrorCode.RolePortalAlreadyExists}
      ${'a capability does not exist'} | ${{ name: ROLE_NAME, capabilities: [PortalCapability.Bypass, 'UNKNOWN_CAPABILITY' as PortalCapability] }} | ${ErrorCode.CapabilityPortalNotFound}
      ${'the name is blank'}           | ${{ name: '  ', capabilities: [] }}                                                                       | ${ErrorCode.InvalidRolePortal}
    `(
      'should throw $errorCode and create nothing when $description',
      async ({ input, errorCode }) => {
        await expect(RolePortalApp.addRolePortal(input)).rejects.toThrow(
          errorCode
        );

        expect(
          await TestHelper.rolePortal.load({ name: ROLE_NAME })
        ).toBeUndefined();
      }
    );
  });

  describe('updateRolePortal', () => {
    const NEW_ROLE_NAME = 'CREPE_MASTER';
    const OTHER_ROLE_NAME = 'WAFFLE_MAKER';

    beforeEach(async () => {
      await RolePortalApp.addRolePortal({
        name: ROLE_NAME,
        capabilities: [PortalCapability.Bypass],
      });
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
      });
      await TestHelper.rolePortal.create({ name: OTHER_ROLE_NAME });
    });

    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: NEW_ROLE_NAME });
      await TestHelper.rolePortal.delete({ name: OTHER_ROLE_NAME });
    });

    it('should rename the role, replace its capabilities and keep its SSO group mappings', async () => {
      // When
      const result = await RolePortalApp.updateRolePortal(ROLE_NAME, {
        name: ` ${NEW_ROLE_NAME} `,
        capabilities: [
          PortalCapability.ReadTrials,
          PortalCapability.ReadTrials,
        ],
      });

      // Then
      expect(result).toEqual(
        expect.objectContaining({
          name: NEW_ROLE_NAME,
          capabilities: [
            expect.objectContaining({ name: PortalCapability.ReadTrials }),
          ],
        })
      );
      const mappings = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: SSO_GROUP,
      });
      expect(mappings).toEqual([
        {
          ssoGroup: SSO_GROUP,
          rolePortal: expect.objectContaining({ name: NEW_ROLE_NAME }),
        },
      ]);
    });

    it('should remove every capability of the role when none is given', async () => {
      const result = await RolePortalApp.updateRolePortal(ROLE_NAME, {
        name: ROLE_NAME,
        capabilities: [],
      });

      expect(result.capabilities).toEqual([]);
    });

    it('should let a protected role change its capabilities when it keeps its name', async () => {
      const userCapabilities = await loadRoleCapabilityNames(ROLE_USER.name);

      const result = await RolePortalApp.updateRolePortal(ROLE_USER.name, {
        name: ROLE_USER.name,
        capabilities: userCapabilities,
      });

      expect(result.id).toBe(ROLE_USER.id);
    });

    it.each`
      description                        | currentName        | input                                                                     | errorCode
      ${'the role does not exist'}       | ${'UNKNOWN_ROLE'}  | ${{ name: NEW_ROLE_NAME, capabilities: [] }}                              | ${ErrorCode.RolePortalNotFound}
      ${'the new name is already taken'} | ${ROLE_NAME}       | ${{ name: OTHER_ROLE_NAME, capabilities: [] }}                            | ${ErrorCode.RolePortalAlreadyExists}
      ${'a capability does not exist'}   | ${ROLE_NAME}       | ${{ name: NEW_ROLE_NAME, capabilities: ['UNKNOWN_CAPABILITY'] }}          | ${ErrorCode.CapabilityPortalNotFound}
      ${'the name is blank'}             | ${ROLE_NAME}       | ${{ name: '  ', capabilities: [] }}                                       | ${ErrorCode.InvalidRolePortal}
      ${'a protected role is renamed'}   | ${ROLE_USER.name}  | ${{ name: NEW_ROLE_NAME, capabilities: [] }}                              | ${ErrorCode.RolePortalProtected}
      ${'the ADMIN role loses BYPASS'}   | ${ROLE_ADMIN.name} | ${{ name: ROLE_ADMIN.name, capabilities: [PortalCapability.ReadTrials] }} | ${ErrorCode.RolePortalProtected}
    `(
      'should throw $errorCode and change nothing when $description',
      async ({ currentName, input, errorCode }) => {
        // When
        await expect(
          RolePortalApp.updateRolePortal(currentName, input)
        ).rejects.toThrow(errorCode);

        // Then
        expect(await loadRoleCapabilityNames(ROLE_NAME)).toEqual([
          PortalCapability.Bypass,
        ]);
        expect(
          await TestHelper.rolePortal.load({ name: NEW_ROLE_NAME })
        ).toBeUndefined();
        expect(await loadRoleCapabilityNames(ROLE_ADMIN.name)).toContain(
          PortalCapability.Bypass
        );
      }
    );
  });

  describe('deleteRolePortal', () => {
    beforeEach(async () => {
      await RolePortalApp.addRolePortal({
        name: ROLE_NAME,
        capabilities: [PortalCapability.Bypass],
      });
      await RolePortalApp.addSSOGroupRolePortal({
        ssoGroup: SSO_GROUP,
        rolePortal: ROLE_NAME,
      });
    });

    afterEach(async () => {
      await TestHelper.rolePortal.delete({ name: ROLE_NAME });
    });

    it('should delete the role with its capabilities and SSO group mappings, and return it', async () => {
      // When
      const result = await RolePortalApp.deleteRolePortal(ROLE_NAME);

      // Then
      expect(result).toEqual(
        expect.objectContaining({
          name: ROLE_NAME,
          capabilities: [expect.objectContaining(CAPABILITY_BYPASS)],
        })
      );
      expect(
        await TestHelper.rolePortal.load({ name: ROLE_NAME })
      ).toBeUndefined();
      expect(
        await TestHelper.rolePortal_CapabilityPortal.loadAll({
          role_portal_id: result.id,
        })
      ).toEqual([]);
      expect(
        await RolePortalDomain.loadSSOGroupRolePortals({ ssoGroup: SSO_GROUP })
      ).toEqual([]);
    });

    it.each`
      description                  | name               | errorCode
      ${'the role does not exist'} | ${'UNKNOWN_ROLE'}  | ${ErrorCode.RolePortalNotFound}
      ${'the role is protected'}   | ${ROLE_ADMIN.name} | ${ErrorCode.RolePortalProtected}
    `(
      'should throw $errorCode when $description',
      async ({ name, errorCode }) => {
        await expect(RolePortalApp.deleteRolePortal(name)).rejects.toThrow(
          errorCode
        );

        expect(
          await TestHelper.rolePortal.load({ name: ROLE_ADMIN.name })
        ).toBeDefined();
      }
    );
  });
});
