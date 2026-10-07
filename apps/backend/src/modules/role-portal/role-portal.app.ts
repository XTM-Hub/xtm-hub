import {
  AddRolePortalInput,
  AddSsoGroupRolePortalInput,
  Capability,
  PortalCapability,
  SsoGroupRolePortal,
  UpdateRolePortalInput,
  UpdateSsoGroupRolePortalInput,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import RolePortal from '../../model/kanel/public/RolePortal';
import { ROLE_ADMIN, ROLE_ADMIN_ORGA, ROLE_USER } from '../../portal.const';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
import { RolePortalDomain } from './role-portal.domain';

type RolePortalWithCapabilities = RolePortal & { capabilities: Capability[] };

// The application relies on these roles by id: they can neither be renamed
// nor deleted, and ADMIN must keep BYPASS so admins cannot lock themselves out.
const PROTECTED_ROLE_PORTAL_IDS = [
  ROLE_ADMIN.id,
  ROLE_ADMIN_ORGA.id,
  ROLE_USER.id,
];

const loadCapabilityPortalIds = async (capabilityNames: PortalCapability[]) => {
  const capabilityPortals =
    await RolePortalDomain.loadCapabilityPortalsByNames(capabilityNames);
  if (capabilityPortals.length !== capabilityNames.length) {
    throw new Error(ErrorCode.CapabilityPortalNotFound);
  }
  return capabilityPortals.map(({ id }) => id);
};

const loadRolePortalByName = async (
  name: string
): Promise<RolePortalWithCapabilities> => {
  const [rolePortal] = await RolePortalDomain.loadRolePortals({ name });
  if (!rolePortal) {
    throw new Error(ErrorCode.RolePortalNotFound);
  }
  return rolePortal;
};

export const RolePortalApp = {
  addSSOGroupRolePortal: async (
    input: AddSsoGroupRolePortalInput
  ): Promise<SsoGroupRolePortal> => {
    const ssoGroup = input.ssoGroup.trim();
    const rolePortalName = input.rolePortal.trim();
    if (!ssoGroup || !rolePortalName) {
      throw new Error(ErrorCode.InvalidSSOGroupRolePortal);
    }

    return withTransaction(async () => {
      const rolePortal =
        await RolePortalDomain.upsertRolePortalByName(rolePortalName);
      await RolePortalDomain.insertSSOGroupRolePortal({
        ssoGroup,
        rolePortalName: rolePortal.name,
      });

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

    return withTransaction(async () => {
      const [existing] = await RolePortalDomain.loadSSOGroupRolePortals({
        ssoGroup: current.ssoGroup,
        rolePortalName: current.rolePortal,
      });
      if (!existing) {
        throw new Error(ErrorCode.SSOGroupRolePortalNotFound);
      }

      // Resolved first so the comparisons below use the stored role name,
      // whatever case the input was typed in.
      const rolePortal =
        await RolePortalDomain.upsertRolePortalByName(rolePortalName);
      const isMappingChanged =
        ssoGroup !== current.ssoGroup || rolePortal.name !== current.rolePortal;
      if (isMappingChanged) {
        const [duplicate] = await RolePortalDomain.loadSSOGroupRolePortals({
          ssoGroup,
          rolePortalName: rolePortal.name,
        });
        if (duplicate) {
          throw new Error(ErrorCode.SSOGroupRolePortalAlreadyExists);
        }
        await RolePortalDomain.updateSSOGroupRolePortal(
          { ssoGroup: current.ssoGroup, rolePortalName: current.rolePortal },
          { ssoGroup, rolePortalName: rolePortal.name }
        );
      }
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

  addRolePortal: async (
    input: AddRolePortalInput
  ): Promise<RolePortalWithCapabilities> => {
    const name = input.name.trim();
    if (!name) {
      throw new Error(ErrorCode.InvalidRolePortal);
    }
    const capabilityNames = [...new Set(input.capabilities)];

    return withTransaction(async () => {
      const [existing] = await RolePortalDomain.loadRolePortals({ name });
      if (existing) {
        throw new Error(ErrorCode.RolePortalAlreadyExists);
      }
      const capabilityPortalIds =
        await loadCapabilityPortalIds(capabilityNames);

      const rolePortal = await RolePortalDomain.insertRolePortal(name);
      await RolePortalDomain.insertMissingRolePortalCapabilities(
        rolePortal.id,
        capabilityPortalIds
      );
      return loadRolePortalByName(name);
    });
  },

  updateRolePortal: async (
    currentName: string,
    input: UpdateRolePortalInput
  ): Promise<RolePortalWithCapabilities> => {
    const name = input.name.trim();
    if (!name) {
      throw new Error(ErrorCode.InvalidRolePortal);
    }
    const capabilityNames = [...new Set(input.capabilities)];
    const isRenamed = name !== currentName;

    return withTransaction(async () => {
      const existing = await loadRolePortalByName(currentName);
      if (
        (isRenamed && PROTECTED_ROLE_PORTAL_IDS.includes(existing.id)) ||
        (existing.id === ROLE_ADMIN.id &&
          !capabilityNames.includes(PortalCapability.Bypass))
      ) {
        throw new Error(ErrorCode.RolePortalProtected);
      }
      if (isRenamed) {
        const [duplicate] = await RolePortalDomain.loadRolePortals({ name });
        if (duplicate) {
          throw new Error(ErrorCode.RolePortalAlreadyExists);
        }
      }
      const capabilityPortalIds =
        await loadCapabilityPortalIds(capabilityNames);

      if (isRenamed) {
        await RolePortalDomain.updateRolePortalName(existing.id, name);
      }
      await RolePortalDomain.replaceRolePortalCapabilities(
        existing.id,
        capabilityPortalIds
      );
      return loadRolePortalByName(name);
    });
  },

  deleteRolePortal: async (
    name: string
  ): Promise<RolePortalWithCapabilities> => {
    return withTransaction(async () => {
      const existing = await loadRolePortalByName(name);
      if (PROTECTED_ROLE_PORTAL_IDS.includes(existing.id)) {
        throw new Error(ErrorCode.RolePortalProtected);
      }
      await RolePortalDomain.deleteRolePortal(existing.id);
      return existing;
    });
  },
};
