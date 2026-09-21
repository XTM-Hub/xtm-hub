import { db, dbRaw } from '../../../knexfile';
import { requestContext } from '../../context/request.context';
import RolePortal from '../../model/kanel/public/RolePortal';
import { UserId } from '../../model/kanel/public/User';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';

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
};
