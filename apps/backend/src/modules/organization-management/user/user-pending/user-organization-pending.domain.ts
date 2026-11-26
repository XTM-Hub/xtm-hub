import {
  applyFilters,
  applySearch,
  db,
  dbRaw,
  paginate,
} from '../../../../../knexfile';
import {
  Filter,
  OrganizationCapability,
  QueryUsersArgs,
  UserConnection,
  User as UserGenerated,
} from '../../../../__generated__/resolvers-types';
import { withTransaction } from '../../../../context/database.context';
import { requestContext } from '../../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import User, { UserId } from '../../../../model/kanel/public/User';
import UserOrganizationPending, {
  UserOrganizationPendingInitializer,
  UserOrganizationPendingMutator,
} from '../../../../model/kanel/public/UserOrganizationPending';
import { securityGuard } from '../../../../security/guard';

interface OrganizationCleanup {
  organizationId: number;
  organizationName: string;
  count: number;
}

export const UserOrganizationPendingDomain = {
  insertNewUserOrganizationPending: (
    field: UserOrganizationPendingInitializer
  ): Promise<UserOrganizationPending[]> => {
    return db<UserOrganizationPending>('User_Organization_Pending')
      .insert(field)
      .returning('*');
  },

  loadOrganizationsWithPendingUsers: async (): Promise<
    (Organization & { users: User[] })[]
  > => {
    return db<Organization>('Organization')
      .innerJoin(
        'User_Organization_Pending',
        'User_Organization_Pending.organization_id',
        '=',
        'Organization.id'
      )
      .leftJoin('User', 'User.id', '=', 'User_Organization_Pending.user_id')
      .select('Organization.*', dbRaw('json_agg("User") AS users'))
      .groupBy('Organization.id');
  },

  loadPendingUsers: (opts: QueryUsersArgs): Promise<UserConnection> => {
    const user = requestContext.requireUser();
    const loadPendingUserQuery = db<UserGenerated>('User');
    loadPendingUserQuery
      .leftJoin(
        'User_Organization_Pending as UserOrgPendingFilter',
        'User.id',
        'UserOrgPendingFilter.user_id'
      )
      .select('User.*')
      .where(
        'UserOrgPendingFilter.organization_id',
        user.selected_organization_id
      );

    return paginate<UserGenerated, UserConnection>(
      'User',
      opts,
      { unsecured: true },
      loadPendingUserQuery
    );
  },

  loadUserOrganizationPending: (
    field: UserOrganizationPendingMutator
  ): Promise<UserOrganizationPending[]> => {
    return db<UserOrganizationPending>('User_Organization_Pending').where(
      field
    );
  },

  lockUserOrganizationPending: (
    user_id: UserId,
    organization_id: OrganizationId
  ): Promise<UserOrganizationPending | undefined> => {
    return db<UserOrganizationPending>('User_Organization_Pending')
      .where({ user_id, organization_id })
      .forUpdate()
      .first();
  },

  countPendingUsersInOrganization: async (
    organization_id: OrganizationId
  ): Promise<number> => {
    const result = await db<UserOrganizationPending>(
      'User_Organization_Pending'
    )
      .where({ organization_id })
      .count<[{ count: string }]>('user_id as count')
      .first();
    return Number(result?.count ?? 0);
  },

  removeUserFromOrganizationPending: async (
    user_id: UserId,
    organization_id: OrganizationId
  ) => {
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organization_id
    );

    return db<UserOrganizationPending>('User_Organization_Pending')
      .where({ user_id, organization_id })
      .delete('*');
  },

  bulkRemoveUserFromOrganizationPending: async (
    organizationId: OrganizationId,
    ids: UserId[],
    searchTerm: string | undefined,
    filters: Filter[],
    excludedIds: UserId[]
  ) => {
    const { queryBuilder } = await buildBulkUserFromOrganizationPendingQuery(
      organizationId,
      ids,
      searchTerm,
      filters,
      excludedIds
    );
    return queryBuilder.delete('*');
  },

  bulkLoadUserIdsFromOrganizationPending: async (
    organizationId: OrganizationId,
    ids: UserId[],
    searchTerm: string | undefined,
    filters: Filter[],
    excludedIds: UserId[]
  ): Promise<UserId[]> => {
    const { queryBuilder } = await buildBulkUserFromOrganizationPendingQuery(
      organizationId,
      ids,
      searchTerm,
      filters,
      excludedIds
    );
    const results = (await queryBuilder.select('user_id')) as Array<{
      user_id: UserId;
    }>;
    return results.map((row) => row.user_id);
  },
  cleanupPendingUsers: async (): Promise<{
    totalDeleted: number;
    byOrganization: OrganizationCleanup[];
  }> => {
    return withTransaction(async () => {
      const byOrganization = await db<OrganizationCleanup>(
        'User_Organization_Pending'
      )
        .innerJoin('User_Organization', function () {
          this.on(
            'User_Organization.user_id',
            '=',
            'User_Organization_Pending.user_id'
          ).andOn(
            'User_Organization.organization_id',
            '=',
            'User_Organization_Pending.organization_id'
          );
        })
        .leftJoin(
          'Organization',
          'Organization.id',
          '=',
          'User_Organization_Pending.organization_id'
        )
        .select(
          'User_Organization_Pending.organization_id as organizationId',
          'Organization.name as organizationName',
          dbRaw('COUNT(*) as count')
        )
        .groupBy(
          'User_Organization_Pending.organization_id',
          'Organization.name'
        );
      const totalDeleted = await db('User_Organization_Pending')
        .whereExists(function () {
          this.select('*')
            .from('User_Organization')
            .whereRaw(
              '"User_Organization".user_id = "User_Organization_Pending".user_id'
            )
            .andWhereRaw(
              '"User_Organization".organization_id = "User_Organization_Pending".organization_id'
            );
        })
        .del()
        .returning('*');
      return {
        totalDeleted: totalDeleted.length,
        byOrganization: byOrganization.map((org: OrganizationCleanup) => ({
          organizationId: org.organizationId,
          organizationName: org.organizationName,
          count: org.count,
        })),
      };
    });
  },
};

const buildBulkUserFromOrganizationPendingQuery = async (
  organizationId: OrganizationId,
  ids: UserId[],
  searchTerm: string | undefined,
  filters: Filter[],
  excludedIds: UserId[]
) => {
  const qb = db<UserOrganizationPending>('User_Organization_Pending').where(
    'organization_id',
    '=',
    organizationId
  );
  if (searchTerm) {
    qb.leftJoin('User', 'User.id', 'User_Organization_Pending.user_id');
    await applySearch('User', qb, searchTerm);
  }

  if (filters.length > 0) {
    await applyFilters('User_Organization_Pending', qb, filters);
  }

  if ((filters.length > 0 || searchTerm) && excludedIds.length > 0) {
    qb.whereNotIn('user_id', excludedIds);
  } else if (ids.length > 0) {
    qb.whereIn('user_id', ids);
  }
  return { queryBuilder: qb };
};
