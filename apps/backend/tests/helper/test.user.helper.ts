import { v4 as uuidv4 } from 'uuid';
import { expect } from 'vitest';
import { db } from '../../knexfile';
import { OrganizationId } from '../../src/model/kanel/public/Organization';
import RolePortal, {
  RolePortalId,
  RolePortalMutator,
} from '../../src/model/kanel/public/RolePortal';
import User, { UserId, UserMutator } from '../../src/model/kanel/public/User';
import UserOrganization, {
  UserOrganizationInitializer,
  UserOrganizationMutator,
} from '../../src/model/kanel/public/UserOrganization';
import UserOrganizationCapability, {
  UserOrganizationCapabilityMutator,
} from '../../src/model/kanel/public/UserOrganizationCapability';
import UserOrganizationPending, {
  UserOrganizationPendingMutator,
} from '../../src/model/kanel/public/UserOrganizationPending';
import UserRolePortal, {
  UserRolePortalMutator,
} from '../../src/model/kanel/public/UserRolePortal';
import UserService, {
  UserServiceId,
  UserServiceMutator,
} from '../../src/model/kanel/public/UserService';
import UserServiceCapability, {
  UserServiceCapabilityId,
  UserServiceCapabilityMutator,
} from '../../src/model/kanel/public/UserServiceCapability';
import { TEST_ORGANIZATIONS } from '../tests.const';

export const TestUserHelper = {
  user_Service: {
    load: async (
      field: UserServiceMutator
    ): Promise<UserService | undefined> => {
      return db<UserService>('User_Service').where(field).select('*').first();
    },
    loadAll: async (field: UserServiceMutator): Promise<UserService[]> => {
      return db<UserService[]>('User_Service').where(field).select('*');
    },
    create: async (
      data?: Partial<UserService>
    ): Promise<UserService | undefined> => {
      const [userService] = await db<UserService>('User_Service')
        .insert({
          id: uuidv4() as UserServiceId,
          ...data,
        })
        .returning('*');
      return userService;
    },
    delete: async (field: UserServiceMutator) => {
      await db<UserService>('User_Service').where(field).del();
    },
  },
  user_ServiceCapability: {
    create: async (
      data?: UserServiceCapabilityMutator
    ): Promise<UserServiceCapability | undefined> => {
      const [userService] = await db<UserServiceCapability>(
        'UserService_Capability'
      )
        .insert({
          id: uuidv4() as UserServiceCapabilityId,
          ...data,
        })
        .returning('*');
      return userService;
    },
    load: async (
      field: UserServiceCapabilityMutator
    ): Promise<UserServiceCapability> => {
      return db<UserServiceCapability>('UserService_Capability')
        .where(field)
        .first();
    },
    loadAll: async (
      field: UserServiceCapabilityMutator
    ): Promise<UserServiceCapability[]> => {
      return db<UserServiceCapability[]>('UserService_Capability').where(field);
    },
    delete: async (field: UserServiceCapabilityMutator) => {
      await db<UserServiceCapability>('UserService_Capability')
        .where(field)
        .del();
    },
  },
  user_RolePortal: {
    create: async (
      data: UserRolePortalMutator
    ): Promise<UserRolePortal | undefined> => {
      const [userRolePortal] = await db<UserRolePortal>('User_RolePortal')
        .insert(data)
        .returning('*');
      return userRolePortal;
    },
    delete: async (field: UserRolePortalMutator) => {
      await db<UserRolePortal>('User_RolePortal').where(field).del();
    },
    load: async (field: UserRolePortalMutator): Promise<UserRolePortal> => {
      return db<UserRolePortal>('User_RolePortal').where(field).first();
    },
    loadAll: async (
      field: UserRolePortalMutator
    ): Promise<UserRolePortal[]> => {
      return db<UserRolePortal>('User_RolePortal').where(field);
    },
  },
  user_Organization: {
    create: async (data: UserOrganizationInitializer) => {
      const [userOrg] = await db<UserOrganization>('User_Organization')
        .insert(data)
        .returning('*');
      return userOrg;
    },
    delete: async (field: UserOrganizationMutator) => {
      await db<UserOrganization>('User_Organization').where(field).del();
    },
    load: async (field: UserOrganizationMutator): Promise<UserOrganization> => {
      return db<UserOrganization>('User_Organization').where(field).first();
    },
  },
  user_OrganizationCapability: {
    create: async (
      data: Partial<UserOrganizationCapability> & {
        user_organization_id: UserOrganizationCapability['user_organization_id'];
        name: string;
      }
    ): Promise<UserOrganizationCapability | undefined> => {
      const [userOrganizationCapability] = await db<UserOrganizationCapability>(
        'UserOrganization_Capability'
      )
        .insert(data)
        .returning('*');
      return userOrganizationCapability;
    },
    loadAll: async (
      field: UserOrganizationCapabilityMutator
    ): Promise<UserOrganizationCapability[]> => {
      return db<UserOrganizationCapability[]>(
        'UserOrganization_Capability'
      ).where(field);
    },
    delete: async (field: UserOrganizationCapabilityMutator) => {
      await db<UserOrganizationCapability>('UserOrganization_Capability')
        .where(field)
        .del();
    },
  },
  user_OrganizationPending: {
    create: async (data: UserOrganizationPendingMutator) => {
      await db<UserOrganizationPending>('User_Organization_Pending').insert(
        data
      );
    },
    delete: async (field: UserOrganizationPendingMutator) => {
      await db<UserOrganizationPending>('User_Organization_Pending')
        .where(field)
        .del();
    },
    loadAll: async (
      field: UserOrganizationPendingMutator
    ): Promise<UserOrganizationPending[]> => {
      return db<UserOrganizationPending[]>('User_Organization_Pending')
        .where(field)
        .select('*');
    },
    linkUsersToOrganization: async (
      users: User[],
      organizationId: OrganizationId
    ): Promise<void> => {
      const promises = users.map(async (user) => {
        await db<UserOrganizationPending>('User_Organization_Pending').insert({
          organization_id: organizationId,
          user_id: user!.id,
        });
      });

      await Promise.all(promises);
    },
  },
  user: {
    delete: async (field: UserMutator) => {
      await db<User>('User').where(field).del();
    },
    load: async (field: UserMutator): Promise<User> => {
      return db<User>('User').where(field).first();
    },
    loadAll: async (field: UserMutator): Promise<User[]> => {
      return db<User[]>('User').where(field);
    },
    create: async (data: UserMutator) => {
      const [user] = await db<User>('User').insert(data).returning('*');
      return user;
    },
    insert: async (fields: UserMutator = {}): Promise<User> => {
      // eslint-disable-next-line no-restricted-syntax
      const [createdUser] = await db<User>('User')
        .insert({
          id: uuidv4() as UserId,
          salt: 'Fleur de sel',
          password: 'Le mot de passe',
          selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          ...fields,
        })
        .returning('*');

      expect(createdUser).toBeDefined();

      return createdUser!;
    },
    insertWithPendingOrganization: async (
      fields: UserMutator,
      organizationId: OrganizationId
    ): Promise<User> => {
      const user = await TestUserHelper.user.insert(fields);
      await TestUserHelper.user_OrganizationPending.create({
        user_id: user.id,
        organization_id: organizationId,
      });
      return user;
    },
  },
  rolePortal: {
    create: async (data: RolePortalMutator) => {
      const rolePortalId = uuidv4() as unknown as RolePortalId;
      const [userRolePortal] = await db<RolePortal>('RolePortal')
        .insert({
          id: rolePortalId,
          name: `test-admin-${rolePortalId}`,
          ...data,
        })
        .returning('*');
      return userRolePortal;
    },
    load: async (field: RolePortalMutator): Promise<RolePortal> => {
      return db<RolePortal>('RolePortal').where(field).first();
    },
    delete: async (field: RolePortalMutator) => {
      await db<RolePortal>('RolePortal').where(field).del();
    },
  },
};
