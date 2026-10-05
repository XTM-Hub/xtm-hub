import { v4 as uuidv4 } from 'uuid';
import { db, dbRaw } from '../../../knexfile';
import {
  Capability,
  PortalCapability,
  SsoGroupRolePortal,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import CapabilityPortal, {
  CapabilityPortalId,
} from '../../model/kanel/public/CapabilityPortal';
import RolePortal, { RolePortalId } from '../../model/kanel/public/RolePortal';
import RolePortalCapabilityPortal from '../../model/kanel/public/RolePortalCapabilityPortal';
import SSOGroupRolePortal, {
  SSOGroupRolePortalRolePortal,
  SSOGroupRolePortalSSOGroup,
} from '../../model/kanel/public/SSOGroupRolePortal';
import { UserId } from '../../model/kanel/public/User';
import { ROLE_ADMIN } from '../../portal.const';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode, UnknownErrorCode } from '../../utils/error/error.code';
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

  upsertRolePortalByName: async (name: string): Promise<RolePortal> => {
    const [rolePortal] = await db<RolePortal>('RolePortal')
      .insert({ id: uuidv4() as RolePortalId, name })
      .onConflict('name')
      .merge(['name'])
      .returning('*');
    if (!rolePortal) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return rolePortal;
  },

  loadCapabilityPortalsByNames: (
    names: PortalCapability[]
  ): Promise<CapabilityPortal[]> => {
    return db<CapabilityPortal>('CapabilityPortal')
      .whereIn('name', names)
      .select<CapabilityPortal[]>('*');
  },

  insertSSOGroupRolePortal: async ({
    ssoGroup,
    rolePortalName,
  }: {
    ssoGroup: string;
    rolePortalName: string;
  }) => {
    await db<SSOGroupRolePortal>('SSOGroup_RolePortal')
      .insert({
        SSOGroup: ssoGroup as SSOGroupRolePortalSSOGroup,
        RolePortal: rolePortalName as SSOGroupRolePortalRolePortal,
      })
      .onConflict(['SSOGroup', 'RolePortal'])
      .ignore();
  },

  updateSSOGroupRolePortal: async (
    current: { ssoGroup: string; rolePortalName: string },
    next: { ssoGroup: string; rolePortalName: string }
  ) => {
    await db<SSOGroupRolePortal>('SSOGroup_RolePortal')
      .where({
        SSOGroup: current.ssoGroup as SSOGroupRolePortalSSOGroup,
        RolePortal: current.rolePortalName as SSOGroupRolePortalRolePortal,
      })
      .update({
        SSOGroup: next.ssoGroup as SSOGroupRolePortalSSOGroup,
        RolePortal: next.rolePortalName as SSOGroupRolePortalRolePortal,
      });
  },

  deleteSSOGroupRolePortal: async ({
    ssoGroup,
    rolePortalName,
  }: {
    ssoGroup: string;
    rolePortalName: string;
  }): Promise<SsoGroupRolePortal> => {
    const [ssoGroupRolePortal] = await RolePortalDomain.loadSSOGroupRolePortals(
      { ssoGroup, rolePortalName }
    );
    const [deleted] = await db<SSOGroupRolePortal>('SSOGroup_RolePortal')
      .where({
        SSOGroup: ssoGroup as SSOGroupRolePortalSSOGroup,
        RolePortal: rolePortalName as SSOGroupRolePortalRolePortal,
      })
      .del()
      .returning('*');
    if (!deleted || !ssoGroupRolePortal) {
      throw new Error(ErrorCode.SSOGroupRolePortalNotFound);
    }
    return ssoGroupRolePortal;
  },

  replaceRolePortalCapabilities: async (
    role_portal_id: RolePortalId,
    capabilityPortalIds: CapabilityPortalId[]
  ) => {
    await db<RolePortalCapabilityPortal>('RolePortal_CapabilityPortal')
      .where({ role_portal_id })
      .whereNotIn('capability_portal_id', capabilityPortalIds)
      .del();
    await RolePortalDomain.insertMissingRolePortalCapabilities(
      role_portal_id,
      capabilityPortalIds
    );
  },

  // RolePortal_CapabilityPortal has no unique constraint on the pair, so
  // already linked capabilities are filtered out before inserting.
  insertMissingRolePortalCapabilities: async (
    role_portal_id: RolePortalId,
    capabilityPortalIds: CapabilityPortalId[]
  ) => {
    if (capabilityPortalIds.length === 0) {
      return;
    }
    const linkedRows = await db<RolePortalCapabilityPortal>(
      'RolePortal_CapabilityPortal'
    )
      .where({ role_portal_id })
      .whereIn('capability_portal_id', capabilityPortalIds)
      .select<RolePortalCapabilityPortal[]>('capability_portal_id');
    const linkedIds = new Set(
      linkedRows.map(({ capability_portal_id }) => capability_portal_id)
    );
    const missingIds = capabilityPortalIds.filter((id) => !linkedIds.has(id));
    if (missingIds.length === 0) {
      return;
    }
    await db<RolePortalCapabilityPortal>('RolePortal_CapabilityPortal').insert(
      missingIds.map((capability_portal_id) => ({
        role_portal_id,
        capability_portal_id,
      }))
    );
  },

  loadSSOGroupRolePortals: async (
    filter: { ssoGroup?: string; rolePortalName?: string } = {}
  ): Promise<SsoGroupRolePortal[]> => {
    const rows = await db<RolePortal>('RolePortal')
      .join(
        'SSOGroup_RolePortal',
        'RolePortal.name',
        'SSOGroup_RolePortal.RolePortal'
      )
      .modify((queryBuilder) => {
        if (filter.ssoGroup) {
          queryBuilder.where('SSOGroup_RolePortal.SSOGroup', filter.ssoGroup);
        }
        if (filter.rolePortalName) {
          queryBuilder.where('RolePortal.name', filter.rolePortalName);
        }
      })
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
