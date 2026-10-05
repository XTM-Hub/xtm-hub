import {
  AddSsoGroupRolePortalInput,
  SsoGroupRolePortal,
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
};
