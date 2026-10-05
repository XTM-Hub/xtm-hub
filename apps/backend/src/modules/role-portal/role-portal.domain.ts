import { db, dbRaw } from '../../../knexfile';
import {
  Capability,
  SsoGroupRolePortal,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import RolePortal from '../../model/kanel/public/RolePortal';
import { UserId } from '../../model/kanel/public/User';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { formatRawAggObject } from '../../utils/query-raw.util';

export const RolePortalDomain = {
  isAdmin: () => {
    const user = requestContext.requireUser();
    return user.roles_portal.some((role) => role.id === ROLE_ADMIN.id);
  },

  loadRolePortalsBySSOGroups: async (
    ssoGroups: string[]
  ): Promise<{ roles: string[] | null }> => {
    return db<RolePortal>('RolePortal')
      .join(
        'SSOGroup_RolePortal',
        'RolePortal.name',
        'SSOGroup_RolePortal.RolePortal'
      )
      .whereIn('SSOGroup_RolePortal.SSOGroup', ssoGroups)
      .select(dbRaw('array_agg(DISTINCT "RolePortal".name) as roles'))
      .first();
  },

  removeAllUserRolePortal: (user_id: UserId) => {
    return db('User_RolePortal').where({ user_id }).del();
  },

  ensureUserHasRole: async (user_id: UserId, role_portal_id: string) => {
    await db('User_RolePortal')
      .insert({ user_id, role_portal_id })
      .onConflict(['user_id', 'role_portal_id'])
      .ignore();
  },

  assignRoleByName: async (user_id: UserId, role: string) => {
    const rolePortal = await db('RolePortal').where({ name: role }).first();
    if (!rolePortal) {
      logApp.warn(`Role portal '${role}' not found for user`);
      return;
    }
    await RolePortalDomain.ensureUserHasRole(user_id, rolePortal.id);
  },

  loadSSOGroupRolePortals: async (): Promise<SsoGroupRolePortal[]> => {
    const rows = await db<RolePortal>('RolePortal')
      .join(
        'SSOGroup_RolePortal',
        'RolePortal.name',
        'SSOGroup_RolePortal.RolePortal'
      )
      .leftJoin(
        'RolePortal_CapabilityPortal as rolePortal_CapabilityPortal',
        'RolePortal.id',
        'rolePortal_CapabilityPortal.role_portal_id'
      )
      .leftJoin(
        'CapabilityPortal as capability',
        'capability.id',
        'rolePortal_CapabilityPortal.capability_portal_id'
      )
      .groupBy('RolePortal.id', 'SSOGroup_RolePortal.SSOGroup')
      .select<
        (RolePortal & { ssoGroup: string; capabilities: Capability[] })[]
      >(
        'RolePortal.*',
        'SSOGroup_RolePortal.SSOGroup as ssoGroup',
        dbRaw(
          formatRawAggObject({
            columnName: 'capability',
            typename: 'CapabilityPortal',
            as: 'capabilities',
          })
        )
      );
    return rows.map(({ ssoGroup, ...rolePortal }) => ({
      ssoGroup,
      rolePortal,
    }));
  },
};
