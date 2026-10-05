import {
  AddSsoGroupRolePortalInput,
  SsoGroupRolePortal,
  UpdateSsoGroupRolePortalInput,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { RolePortalDomain } from './role-portal.domain';

export const RolePortalApp = {
  addSSOGroupRolePortal: async (
    input: AddSsoGroupRolePortalInput
  ): Promise<SsoGroupRolePortal> => {
    const ssoGroup = input.ssoGroup.trim();
    const rolePortalName = input.rolePortal.trim();
    if (!ssoGroup || !rolePortalName) {
      throw new Error(ErrorCode.InvalidSSOGroupRolePortal);
    }
    const capabilityNames = [...new Set(input.capabilities)];

    return withTransaction(async () => {
      const capabilityPortals =
        await RolePortalDomain.loadCapabilityPortalsByNames(capabilityNames);
      if (capabilityPortals.length !== capabilityNames.length) {
        throw new Error(ErrorCode.CapabilityPortalNotFound);
      }

      const rolePortal =
        await RolePortalDomain.upsertRolePortalByName(rolePortalName);
      await RolePortalDomain.insertSSOGroupRolePortal({
        ssoGroup,
        rolePortalName: rolePortal.name,
      });

      await RolePortalDomain.insertMissingRolePortalCapabilities(
        rolePortal.id,
        capabilityPortals.map(({ id }) => id)
      );

      const [ssoGroupRolePortal] =
        await RolePortalDomain.loadSSOGroupRolePortals({
          ssoGroup,
          rolePortalName: rolePortal.name,
        });
      if (!ssoGroupRolePortal) {
        throw new Error(UnknownErrorCode.UnknownError);
      }
      return ssoGroupRolePortal;
    });
  },

  updateSSOGroupRolePortal: async (
    current: { ssoGroup: string; rolePortal: string },
    input: UpdateSsoGroupRolePortalInput
  ): Promise<SsoGroupRolePortal> => {
    const ssoGroup = input.ssoGroup.trim();
    const rolePortalName = input.rolePortal.trim();
    if (!ssoGroup || !rolePortalName) {
      throw new Error(ErrorCode.InvalidSSOGroupRolePortal);
    }
    const capabilityNames = [...new Set(input.capabilities)];
    const isMappingChanged =
      ssoGroup !== current.ssoGroup || rolePortalName !== current.rolePortal;

    return withTransaction(async () => {
      const [existing] = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: current.ssoGroup,
        rolePortalName: current.rolePortal,
      });
      if (!existing) {
        throw new Error(ErrorCode.SSOGroupRolePortalNotFound);
      }

      if (isMappingChanged) {
        const [duplicate] = await RolePortalDomain.loadSSOGroupRolePortals({
          ssoGroup,
          rolePortalName,
        });
        if (duplicate) {
          throw new Error(ErrorCode.SSOGroupRolePortalAlreadyExists);
        }
      }

      const capabilityPortals =
        await RolePortalDomain.loadCapabilityPortalsByNames(capabilityNames);
      if (capabilityPortals.length !== capabilityNames.length) {
        throw new Error(ErrorCode.CapabilityPortalNotFound);
      }

      const rolePortal =
        await RolePortalDomain.upsertRolePortalByName(rolePortalName);
      if (isMappingChanged) {
        await RolePortalDomain.updateSSOGroupRolePortal(
          { ssoGroup: current.ssoGroup, rolePortalName: current.rolePortal },
          { ssoGroup, rolePortalName: rolePortal.name }
        );
      }
      await RolePortalDomain.replaceRolePortalCapabilities(
        rolePortal.id,
        capabilityPortals.map(({ id }) => id)
      );

      const [updated] = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup,
        rolePortalName: rolePortal.name,
      });
      if (!updated) {
        throw new Error(UnknownErrorCode.UnknownError);
      }
      return updated;
    });
  },
};
