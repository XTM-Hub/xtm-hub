import { GraphQLError } from 'graphql/error/index.js';
import {
  Capability,
  User as GraphqlUser,
  OrganizationCapability,
  RolePortal,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import {
  SubscriptionId,
  SubscriptionMutator,
} from '../../../model/kanel/public/Subscription';
import User, { UserId, UserMutator } from '../../../model/kanel/public/User';
import {
  UserLoadUserBy,
  UserWithOrganizationsAndRole,
} from '../../../model/user';
import { dispatch } from '../../../pub';
import { updateUserSession } from '../../../session-store-manager';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import {
  ErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../../utils/error/error.code';
import { NotFoundError, UnknownError } from '../../../utils/error/error.util';
import { isEmpty } from '../../../utils/utils';
import { UserOrganizationCapabilityDomain } from '../../security-management/user-organization-capability/user-organization-capability.domain';
import { SubscriptionDomain } from '../../subscription/subscription.domain';
import { OrganizationDomain } from '../organization/organization.domain';
import { UserDomain } from './user-domain/user.domain';
import { UserOrganizationDomain } from './user-organization/user-organization.domain';

const countOrganizationAdministrators = async (
  organizationId: OrganizationId
): Promise<number> => {
  return UserOrganizationDomain.countOrganizationAdministrators(organizationId);
};

export const isUserLastOrganizationAdministrator = async (
  userId: UserId,
  organizationId: OrganizationId
) => {
  const { capabilities } = await UserDomain.loadUserCapabilitiesByOrganization(
    userId,
    organizationId
  );
  if (!UserHelper.hasAdministrateOrganizationCapability(capabilities)) {
    return false;
  }

  const administratorsCount =
    await countOrganizationAdministrators(organizationId);

  if (administratorsCount === 0) {
    logApp.error(
      `Zero administrators found in the organization ${organizationId}`
    );
  }

  return administratorsCount <= 1;
};

const updateUserCapabilities = async ({
  user_id,
  organization_id,
  orgCapabilities,
}: {
  user_id: UserId;
  organization_id: OrganizationId;
  orgCapabilities?: string[] | null;
}) => {
  const user = await withTransaction(async () => {
    await UserOrganizationDomain.updateUserOrgCapabilities({
      user_id,
      organization_id,
      orgCapabilities,
    });

    const user = await UserDomain.loadUserDetails({
      'User.id': user_id,
    });

    updateUserSession(user);
    return user;
  });
  const userMapped = UserHelper.mapUserToGraphqlUser(user);
  return { user, userMapped };
};

export const UserHelper = {
  insertUserIntoOrganization: async (
    user: User,
    subscriptionId: SubscriptionId
  ) => {
    const [subscription] =
      await SubscriptionDomain.loadSubscriptionWithOrganizationAndCapabilitiesBy(
        {
          'Subscription.id': subscriptionId,
        } as SubscriptionMutator
      );
    const [organization] = await OrganizationDomain.loadOrganizationsFromEmail(
      user.email
    );
    if (!organization) {
      throw NotFoundError(NotFoundErrorCode.UserNotFound);
    }
    const userOrganization = await UserOrganizationDomain.loadUserOrganization({
      user_id: user.id,
      organization_id: organization.id,
    });
    if (subscription.organization_id !== organization.id) {
      throw new GraphQLError(
        'The email address does not correspond to the current organization',
        {
          extensions: { code: '[User_Service] EMAIL ADDRESS WRONG DOMAIN' },
        }
      );
    }
    if (isEmpty(userOrganization)) {
      const [userOrgRelation] =
        await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
          {
            user_id: user.id,
            organizations_id: [organization.id],
          }
        );
      if (!userOrgRelation) {
        throw UnknownError(UnknownErrorCode.AddingUserError);
      }
      const shouldBeAdminOrga = await UserHelper.isFirstInOrganization(
        organization.id
      );
      if (shouldBeAdminOrga) {
        await UserOrganizationCapabilityDomain.createUserOrganizationCapability(
          {
            user_organization_id: userOrgRelation.id,
            capabilities_name: [
              OrganizationCapability.AdministrateOrganization,
            ],
          }
        );
      }
    }
  },

  isFirstInOrganization: async (organizationId: OrganizationId) => {
    const userOrganization = await UserOrganizationDomain.loadUserOrganization({
      organization_id: organizationId,
    });
    return userOrganization.length === 1;
  },

  mapUserToGraphqlUser: (
    user: User | UserLoadUserBy | UserWithOrganizationsAndRole
  ): GraphqlUser => {
    return {
      ...user,
      selected_organization_id: user.selected_organization_id,
      capabilities:
        'capabilities' in user ? (user.capabilities as Capability[]) : null,
      roles_portal:
        'roles_portal' in user ? (user.roles_portal as RolePortal[]) : null,
    };
  },

  deleteUserPicture: async (pictureMinio: string | null) => {
    if (!pictureMinio) {
      return;
    }
    try {
      await MinIOClient.deleteFile(pictureMinio);
    } catch (error) {
      logApp.error('Error deleting user picture from MinIO', { error });
    }
  },

  removeUser: async (field: UserMutator) => {
    const deletedUser = await UserDomain.deleteUserBy(field);

    if (!deletedUser) {
      throw NotFoundError(NotFoundErrorCode.UserNotFound);
    }

    // Organization personalSpace of the user should have the same id
    await OrganizationDomain.deleteOrganizationBy({
      id: deletedUser.id as unknown as OrganizationId,
    });

    return deletedUser;
  },

  hasAdministrateOrganizationCapability: (
    capabilities?: string[] | null
  ): boolean => {
    return (capabilities ?? []).includes(
      OrganizationCapability.AdministrateOrganization
    );
  },

  preventAdministratorRemovalOfOneOrganization: async (
    userId: UserId,
    organizationId: OrganizationId,
    capabilities?: string[] | null
  ) => {
    const isRemovingAdministratorCapability =
      !UserHelper.hasAdministrateOrganizationCapability(capabilities);

    if (!isRemovingAdministratorCapability) {
      return;
    }

    const isLastWithCapability = await isUserLastOrganizationAdministrator(
      userId,
      organizationId
    );

    if (isLastWithCapability) {
      throw new Error(ErrorCode.CantRemoveLastAdministrator);
    }
  },

  preventAdministratorRemovalOfAllOrganizations: async (
    userId: UserId,
    newOrganizationCapabilities: {
      organizationId: OrganizationId;
      capabilities?: string[] | null;
    }[]
  ) => {
    const userOrganizations =
      await OrganizationDomain.loadNonPersonalSpaceOrganizationIdsByUser(
        userId
      );

    for (const organization of userOrganizations) {
      const organizationCapabilities = (newOrganizationCapabilities ?? []).find(
        (newCapabilities) => newCapabilities.organizationId === organization.id
      );

      await UserHelper.preventAdministratorRemovalOfOneOrganization(
        userId,
        organization.id,
        organizationCapabilities?.capabilities
      );
    }
  },

  removePending: async (
    user: User | UserLoadUserBy | UserWithOrganizationsAndRole,
    organization_id: OrganizationId
  ): Promise<boolean> => {
    const deleted = await UserOrganizationDomain.removeUserFromPendingList({
      user_id: user.id,
      organization_id,
    });
    return deleted.length > 0;
  },

  dispatchPendingDeleted: async (
    user: User | UserLoadUserBy | UserWithOrganizationsAndRole,
    organization_id: OrganizationId
  ) => {
    const userPendingPayload: GraphqlUser = {
      ...UserHelper.mapUserToGraphqlUser(user),
      pending_organization_id: organization_id,
    };
    await dispatch('UserPending', 'delete', userPendingPayload, 'User');
  },

  removePendingAndDispatch: async (
    user: User | UserLoadUserBy | UserWithOrganizationsAndRole,
    organization_id: OrganizationId
  ) => {
    if (await UserHelper.removePending(user, organization_id)) {
      await UserHelper.dispatchPendingDeleted(user, organization_id);
    }
  },

  acceptPendingUserWithCapabilities: async ({
    user_id,
    organization_id,
    orgCapabilities,
  }: {
    user_id: UserId;
    organization_id: OrganizationId;
    orgCapabilities?: string[] | null;
  }) => {
    const { user, userMapped } = await withTransaction(async () => {
      await UserOrganizationDomain.createUserOrganizationRelationAndRemovePending(
        {
          user_id,
          organizations_id: [organization_id],
        }
      );

      return await updateUserCapabilities({
        user_id,
        organization_id,
        orgCapabilities,
      });
    });

    await dispatch('User', 'edit', user);
    await dispatch('MeUser', 'edit', userMapped, 'User');
    const userPendingPayload: GraphqlUser = {
      ...userMapped,
      pending_organization_id: organization_id,
    };

    await dispatch('UserPending', 'delete', userPendingPayload, 'User');
    await dispatch('User', 'add', user);
    return user;
  },

  updateUserOrgCapabilitiesAndDispatch: async ({
    user_id,
    organization_id,
    orgCapabilities,
  }: {
    user_id: UserId;
    organization_id: OrganizationId;
    orgCapabilities?: string[] | null;
  }) => {
    const { user, userMapped } = await updateUserCapabilities({
      user_id,
      organization_id,
      orgCapabilities,
    });

    await dispatch('User', 'edit', user);
    await dispatch('MeUser', 'edit', userMapped, 'User');

    return user;
  },

  updateAndDispatchUser: async (userId: UserId) => {
    const user = await UserDomain.loadUserDetails({ 'User.id': userId });
    updateUserSession(user);
    const mappedUser = UserHelper.mapUserToGraphqlUser(user);
    await dispatch('User', 'edit', mappedUser);
    return mappedUser;
  },
};
