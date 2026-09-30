import { type Knex } from 'knex';
import { db, dbRaw, paginate } from '../../../../../knexfile';
import {
  Filter,
  FilterKey,
  Organization,
  OrganizationCapability,
  PlatformIdentifier,
  QueryUsersArgs,
  ServiceGroupName,
  UserAccountStatus,
  UserConnection,
  User as UserGenerated,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import CapabilityPortal from '../../../../model/kanel/public/CapabilityPortal';
import { DeploymentRequestId } from '../../../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import User, {
  UserId,
  UserInitializer,
  UserMutator,
} from '../../../../model/kanel/public/User';
import UserOrganization from '../../../../model/kanel/public/UserOrganization';
import UserService from '../../../../model/kanel/public/UserService';
import {
  UserLoadUserBy,
  UserWithOrganizationsAndRole,
} from '../../../../model/user';
import { ADMIN_UUID, CAPABILITY_BYPASS } from '../../../../portal.const';
import { auth0Client } from '../../../../thirdparty/auth0/client';
import { hubspotLoginHook } from '../../../../thirdparty/hubspot/hubspot';
import { logApp } from '../../../../utils/app-logger.util';
import {
  ErrorCode,
  UnknownErrorCode,
} from '../../../../utils/error/error.code';
import { UnknownError } from '../../../../utils/error/error.util';
import { formatRawAggObject } from '../../../../utils/query-raw.util';
import { addPrefixToObject } from '../../../../utils/typescript';
import { isEmpty } from '../../../../utils/utils';
import { RolePortalDomain } from '../../../role-portal/role-portal.domain';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../../telemetry/telemetry.helper';

export type LoadUserByFilter = (
  addPrefixToObject<UserMutator, 'User.'> | UserMutator
) & {
  'Organization.id'?: OrganizationId;
};

export const UserDomain = {
  loadUsers: async (userIds: UserId[]): Promise<User[]> => {
    return db<User[]>('User').whereIn('id', userIds);
  },

  insertUser: async (initializer: UserInitializer): Promise<User> => {
    const [insertedUser] = await db<User>('User')
      .insert(initializer)
      .returning('*');

    if (!insertedUser) {
      throw UnknownError(UnknownErrorCode.AddingUserError);
    }

    return insertedUser;
  },

  loadUser: async (
    field: addPrefixToObject<UserMutator, 'User.'> | UserMutator
  ): Promise<User[]> => {
    return db<User>('User').where(field);
  },

  getOrganizations: (id: string) => {
    return db<Organization>('Organization')
      .leftJoin(
        'User_Organization',
        'Organization.id',
        'User_Organization.organization_id'
      )
      .leftJoin('User', 'User.id', 'User_Organization.user_id')
      .where('User.id', '=', id)
      .groupBy('Organization.id')
      .select('Organization.*');
  },

  getCapabilities: async (id: string) => {
    const capabilities = await db<UserLoadUserBy['capabilities']>(
      'CapabilityPortal'
    )
      .leftJoin(
        'RolePortal_CapabilityPortal as rolePortal_CapabilityPortal',
        'CapabilityPortal.id',
        '=',
        'rolePortal_CapabilityPortal.capability_portal_id'
      )
      .leftJoin(
        'User_RolePortal as user_RolePortal',
        'rolePortal_CapabilityPortal.role_portal_id',
        '=',
        'user_RolePortal.role_portal_id'
      )
      .leftJoin('User', 'User.id', '=', 'user_RolePortal.user_id')
      .where('User.id', '=', id)
      .groupBy('CapabilityPortal.id')
      .select('CapabilityPortal.*');
    if (id === ADMIN_UUID) {
      const capabilityIds = capabilities.map((c: CapabilityPortal) => c.id);
      if (!capabilityIds.includes(CAPABILITY_BYPASS.id)) {
        capabilities.push(CAPABILITY_BYPASS);
      }
    }
    return capabilities;
  },

  getRolesPortal: (id: string) => {
    return db<UserLoadUserBy['capabilities']>('RolePortal')
      .leftJoin(
        'User_RolePortal as user_RolePortal',
        'RolePortal.id',
        '=',
        'user_RolePortal.role_portal_id'
      )
      .leftJoin('User', 'User.id', '=', 'user_RolePortal.user_id')
      .where('User.id', '=', id)
      .select('RolePortal.*');
  },

  loadSimpleUserBy: async (
    field: addPrefixToObject<UserMutator, 'User.'> | UserMutator
  ): Promise<User> => {
    return db<User>('User').where(field).first();
  },

  loadUserPictureMinio: async (userId: string): Promise<string | null> => {
    const [user] = await db<User>('User')
      .where('id', userId)
      .select('picture_minio');
    return user?.picture_minio ?? null;
  },

  loadUserBy: async (
    field: LoadUserByFilter
  ): Promise<UserLoadUserBy | undefined> => {
    const { 'Organization.id': organizationId, ...userFilter } = field;

    const restrictToOrganization = (queryBuilder: Knex.QueryBuilder) => {
      if (!organizationId) {
        return;
      }
      queryBuilder.whereExists(function () {
        this.select(dbRaw('1'))
          .from('User_Organization')
          .whereRaw('"User_Organization"."user_id" = "User"."id"')
          .andWhere('User_Organization.organization_id', '=', organizationId);
      });
    };

    const [foundUser] = await db<UserLoadUserBy>('User')
      .where(userFilter)
      .modify(restrictToOrganization);
    if (!foundUser) {
      return;
    }

    if (foundUser.disabled) {
      throw new Error(ErrorCode.UserDisabled);
    }

    const userOrganizationCapabilityQuery = db<UserService>('User_Organization')
      .leftJoin(
        'UserOrganization_Capability',
        'User_Organization.id',
        'UserOrganization_Capability.user_organization_id'
      )
      .select(
        dbRaw(
          `COALESCE(
                      json_agg(DISTINCT "UserOrganization_Capability".name)
                      FILTER (WHERE "UserOrganization_Capability".name IS NOT NULL),
                      '[]'::json
      ) AS capabilities`
        )
      )
      .whereRaw(
        `"UserOrganization_Capability"."user_organization_id" = "UserOrg"."id"`
      );

    const userQuery = db<UserLoadUserBy>('User')
      .where(userFilter)
      .modify(restrictToOrganization)
      .leftJoin('User_Organization as UserOrg', 'User.id', 'UserOrg.user_id')
      .leftJoin('User_Organization as selected_user_orga', function () {
        this.on(
          'User.selected_organization_id',
          '=',
          'selected_user_orga.organization_id'
        ).andOn('User.id', '=', 'selected_user_orga.user_id');
      })
      .leftJoin(
        'UserOrganization_Capability',
        'selected_user_orga.id',
        'UserOrganization_Capability.user_organization_id'
      )
      .leftJoin('Organization as org', 'UserOrg.organization_id', '=', 'org.id')
      .leftJoin(
        'User_RolePortal as user_RolePortal',
        'User.id',
        '=',
        'user_RolePortal.user_id'
      )
      .leftJoin(
        'RolePortal_CapabilityPortal as rolePortal_CapabilityPortal',
        'user_RolePortal.role_portal_id',
        '=',
        'rolePortal_CapabilityPortal.role_portal_id'
      )
      .leftJoin(
        'CapabilityPortal as capability',
        'capability.id',
        '=',
        'rolePortal_CapabilityPortal.capability_portal_id'
      )
      .leftJoin(
        'RolePortal as rolePortal',
        'user_RolePortal.role_portal_id',
        '=',
        'rolePortal.id'
      )
      // Inspiration from https://github.com/knex/knex/issues/882
      .select([
        'User.*',
        dbRaw(
          formatRawAggObject({
            columnName: 'org',
            typename: 'Organization',
            as: 'Organizations',
          })
        ),
        dbRaw(
          formatRawAggObject({
            columnName: 'rolePortal',
            typename: 'RolePortal',
            as: 'roles_portal',
          })
        ),
        dbRaw(
          formatRawAggObject({
            columnName: 'capability',
            typename: 'CapabilityPortal',
            as: 'capabilities',
          })
        ),
        dbRaw(
          `COALESCE(
      json_agg(DISTINCT "UserOrganization_Capability".name)
      FILTER (WHERE "UserOrganization_Capability".name IS NOT NULL),
      '[]'
    )::json AS selected_org_capabilities`
        ),
        dbRaw(
          `COALESCE(
            json_agg( DISTINCT jsonb_build_object(
                '__typename', 'User_Organization',
                'id', "UserOrg".id,
                'organization', to_jsonb("org") || jsonb_build_object('__typename', 'Organization'),
                'capabilities', (${userOrganizationCapabilityQuery})
            ) )
              FILTER (WHERE "org".id IS NOT NULL), '[]'
          )::json AS organization_capabilities`
        ),
      ])
      .groupBy(['User.id'])
      .first();

    return userQuery;
  },

  loadUsersByCapabilitiesInOrganization: async (
    organizationId: string,
    capabilities: OrganizationCapability[]
  ): Promise<User[]> => {
    if (!capabilities.length) {
      return [];
    }

    const users: User[] = await db<User>('User')
      .leftJoin('User_Organization', 'User_Organization.user_id', 'User.id')
      .leftJoin(
        'UserOrganization_Capability',
        'UserOrganization_Capability.user_organization_id',
        'User_Organization.id'
      )
      .where('User_Organization.organization_id', '=', organizationId)
      .andWhere((qb) => {
        qb.whereIn('UserOrganization_Capability.name', capabilities);
      })
      .select('User.*')
      .distinct();

    return users;
  },

  loadUserConnection: (opts: QueryUsersArgs) => {
    const { filters } = opts;
    const loadUserQuery = db<UserGenerated>('User');

    const userOrganizationCapabilityQuery = db<UserService>('User_Organization')
      .leftJoin(
        'UserOrganization_Capability',
        'User_Organization.id',
        'UserOrganization_Capability.user_organization_id'
      )
      .select(
        dbRaw(
          `COALESCE(
                      json_agg(DISTINCT "UserOrganization_Capability".name)
                      FILTER (WHERE "UserOrganization_Capability".name IS NOT NULL),
                      '[]'::json
      ) AS capabilities`
        )
      )
      .whereRaw(
        `"UserOrganization_Capability"."user_organization_id" = "UserOrg"."id"`
      );
    loadUserQuery
      .leftJoin('User_Organization as UserOrg', 'User.id', 'UserOrg.user_id')
      .leftJoin('Organization as org', 'UserOrg.organization_id', '=', 'org.id')
      // Inspiration from https://github.com/knex/knex/issues/882
      .select([
        'User.*',
        dbRaw(
          `COALESCE(
            json_agg( DISTINCT jsonb_build_object(
                '__typename', 'User_Organization',
                'id', "UserOrg".id,
                'organization', to_jsonb("org") || jsonb_build_object('__typename', 'Organization'),
                'capabilities', (${userOrganizationCapabilityQuery})
            ) )
             FILTER (WHERE "org".id IS NOT NULL), '[]'
          )::json AS organization_capabilities`
        ),
      ])
      .groupBy(['User.id']);

    if (!RolePortalDomain.isAdmin()) {
      const user = requestContext.requireUser();
      loadUserQuery.where(
        'UserOrg.organization_id',
        user.selected_organization_id
      );
    }
    return paginate<UserGenerated, UserConnection>(
      'User',
      {
        ...opts,
        filters: filters?.map(({ key, value }) => {
          if (key === FilterKey.OrganizationId) {
            return {
              key: 'UserOrg.organization_id',
              value,
            } as unknown as Filter;
          }
          return { key, value };
        }),
      },
      undefined,
      loadUserQuery
    );
  },

  resetPassword: async (): Promise<void> => {
    const user = requestContext.requireUser();
    await auth0Client.resetPassword(user.email);
  },

  updateUser: async (
    id: UserId,
    input: UserMutator,
    expected: Omit<UserMutator, 'id'> = {}
  ): Promise<User | undefined> => {
    if (isEmpty(input)) {
      return;
    }

    const [updatedUser] = await db<User>('User')
      .where({ ...expected, id })
      .update(input)
      .returning('*');

    return updatedUser;
  },

  deleteUserBy: async (field: UserMutator): Promise<User | undefined> => {
    const [deletedUser] = await db<User>('User')
      .where(field)
      .delete('*')
      .returning('*');

    return deletedUser;
  },

  loadUserCapabilitiesByOrganization: async (
    user_id: UserId,
    organization_id: OrganizationId
  ): Promise<{ capabilities?: string[] }> => {
    return db<UserOrganization>('User_Organization')
      .leftJoin(
        'UserOrganization_Capability',
        'User_Organization.id',
        'UserOrganization_Capability.user_organization_id'
      )
      .where({ user_id, organization_id })
      .select([
        dbRaw('json_agg("UserOrganization_Capability".name) as capabilities'),
      ])
      .first();
  },

  loadUserDetails: async (
    field: addPrefixToObject<UserMutator, 'User.'> | UserMutator
  ): Promise<UserWithOrganizationsAndRole> => {
    const userOrganizationCapabilityQuery = db<UserService>('User_Organization')
      .leftJoin(
        'UserOrganization_Capability',
        'User_Organization.id',
        'UserOrganization_Capability.user_organization_id'
      )
      .select(
        dbRaw(
          `COALESCE(
                      json_agg(DISTINCT "UserOrganization_Capability".name)
                      FILTER (WHERE "UserOrganization_Capability".name IS NOT NULL),
                      '[]'::json
      ) AS capabilities`
        )
      )
      .whereRaw(
        `"UserOrganization_Capability"."user_organization_id" = "UserOrg"."id"`
      );
    return db<UserWithOrganizationsAndRole>('User')
      .where(field)
      .leftJoin('User_Organization as UserOrg', 'User.id', 'UserOrg.user_id')
      .leftJoin('Organization as org', 'UserOrg.organization_id', '=', 'org.id')
      .leftJoin(
        'User_RolePortal as user_RolePortal',
        'User.id',
        '=',
        'user_RolePortal.user_id'
      )
      .leftJoin(
        'RolePortal as rolePortal',
        'user_RolePortal.role_portal_id',
        '=',
        'rolePortal.id'
      )
      .select([
        'User.*',
        dbRaw(
          `COALESCE(
            json_agg( DISTINCT jsonb_build_object(
                '__typename', 'User_Organization',
                'id', "UserOrg".id,
                'organization', to_jsonb("org") || jsonb_build_object('__typename', 'Organization'),
                'capabilities', (${userOrganizationCapabilityQuery})
            ) )
              FILTER (WHERE "org".id IS NOT NULL), '[]'
          )::json AS organization_capabilities`
        ),
        dbRaw(
          formatRawAggObject({
            columnName: 'rolePortal',
            typename: 'RolePortal',
            as: 'roles_portal',
          })
        ),
      ])
      .groupBy(['User.id'])
      .first();
  },

  updateUserAtLogin: async (user: UserLoadUserBy): Promise<UserLoadUserBy> => {
    await hubspotLoginHook(user.id);

    const organizations = user.organizations.filter((o) => !o.personal_space);
    const shouldClearStatusNow =
      user.status !== null && user.status !== UserAccountStatus.Waiting;
    const fields: UserMutator = {
      last_login: new Date(),
      ...(shouldClearStatusNow && { status: null }),
    };
    if (organizations.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      fields.selected_organization_id = organizations[0]!.id;
    }

    const [updatedUser] = await db<User>('User')
      .where({ id: user.id })
      .update(fields)
      .returning('*');
    if (!updatedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }

    try {
      const selectedOrga = user.organizations.find(
        (org) => org.id === updatedUser.selected_organization_id
      );
      if (selectedOrga) {
        const loginEvent = TelemetryHelper.buildLoginEvent(
          selectedOrga,
          user.id
        );
        await TelemetryApp.sendTelemetryEvent(loginEvent);
      }
    } catch (error) {
      logApp.error('Unable to send telemetry event for login', {
        error,
      });
    }
    const reloadedUser = await UserDomain.loadUserBy({ 'User.id': user.id });
    if (!reloadedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }
    return reloadedUser;
  },

  loadUsersWithDeploymentServiceGroups: async (
    parentDeploymentRequestId: DeploymentRequestId
  ): Promise<UserServiceGroupRow[]> => {
    return db<UserServiceGroupRow>('User')
      .innerJoin(
        'ServiceGroup_User',
        'ServiceGroup_User.user_id',
        '=',
        'User.id'
      )
      .innerJoin(
        'ServiceGroup',
        'ServiceGroup.id',
        '=',
        'ServiceGroup_User.group_id'
      )
      .innerJoin(
        'DeploymentRequest',
        'DeploymentRequest.service_instance_id',
        '=',
        'ServiceGroup.service_instance_id'
      )
      .where('DeploymentRequest.parent_id', '=', parentDeploymentRequestId)
      .select(
        'User.*',
        'DeploymentRequest.platform_identifier as platform_identifier',
        'ServiceGroup.name as group_name'
      );
  },
};

export type UserServiceGroupRow = User & {
  platform_identifier: PlatformIdentifier | null;
  group_name: ServiceGroupName;
};
