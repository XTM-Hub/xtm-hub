import {
  Resolvers,
  User,
  UserPendingSubscription,
  UserSubscription,
} from '../../../__generated__/resolvers-types';
import { UserId } from '../../../model/kanel/public/User';
import { dispatch, listen } from '../../../pub';
import { hubspotReachOutSalesHook } from '../../../thirdparty/hubspot/hubspot';
import { logApp } from '../../../utils/app-logger.util';
import { getErrorMessage } from '../../../utils/error/error-guard.util';

import { UserTransferRequestId } from '../../../model/kanel/public/UserTransferRequest';
import { PortalContext } from '../../../model/portal-context';
import { ErrorCode, UnknownErrorCode } from '../../../utils/error/error.code';
import { mapToGraphQLError } from '../../../utils/error/error.mapping';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { createRelayIdScalar } from '../../../utils/scalar.util';
import { extractId } from '../../../utils/utils';
import { UserAdminApp } from './user-admin/user.admin.app';
import { UserDomain } from './user-domain/user.domain';
import { UserOrganizationApp } from './user-organization/user-organization.app';
import { UserOrganizationPendingDomain } from './user-pending/user-organization-pending.domain';
import { userProfileApp } from './user-profile/user.profile.app';
import { UserAuthApp } from './user.auth.app';
import { UserHelper } from './user.helper';

const resolvers: Resolvers = {
  UserId: createRelayIdScalar<UserId>('User'),
  User: {
    organizations: ({ id }, _) => UserDomain.getOrganizations(id),
    capabilities: ({ id }, _) => UserDomain.getCapabilities(id),
    roles_portal: ({ id }, _) => UserDomain.getRolesPortal(id),
  },
  Query: {
    me: async (_, __, context) => {
      // User is not logged in
      if (!context.user) {
        return null;
      }
      return UserHelper.mapUserToGraphqlUser(context.user);
    },

    usersWithCapabilitiesInOrganization: async (_, { input }) => {
      return UserDomain.loadUsersByCapabilitiesInOrganization(
        input.organizationId,
        input.capabilities
      );
    },
    users: async (
      _,
      { first, after, orderMode, orderBy, searchTerm, filters }
    ) => {
      return UserDomain.loadUserConnection({
        first,
        after,
        orderMode,
        orderBy,
        filters,
        searchTerm,
      });
    },
    pendingUsers: async (
      _,
      { first, after, orderMode, orderBy, searchTerm, filters }
    ) => {
      return UserOrganizationPendingDomain.loadPendingUsers({
        first,
        after,
        orderMode,
        orderBy,
        filters,
        searchTerm,
      });
    },
  },
  Mutation: {
    // Management
    addUser: async (_, { input }) => {
      try {
        const user = await UserOrganizationApp.addUserToOrganization(input);

        await dispatch('User', 'add', user);

        return UserHelper.mapUserToGraphqlUser(user);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.AddingUserError);
      }
    },

    // Admin
    adminAddUser: async (_, { input }) => {
      try {
        const user = await UserAdminApp.addUser(input);
        return UserHelper.mapUserToGraphqlUser(user);
      } catch (error) {
        if (getErrorMessage(error).includes(ErrorCode.UserDisabled)) {
          logApp.warn('You cannot add a user who is disabled in the plaform');
          throw ForbiddenAccess(ErrorCode.CantAddDisabledUser);
        }

        throw mapToGraphQLError(error, UnknownErrorCode.AddingUserError);
      }
    },
    editUserCapabilities: async (_, { id, input }) => {
      try {
        return await UserAdminApp.editUserCapabilities({
          userId: id as UserId,
          input,
        });
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EditUserError);
      }
    },
    adminEditUser: async (_, { id, input }) => {
      try {
        return await UserAdminApp.editUser({
          userId: id as UserId,
          input,
        });
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EditUserError);
      }
    },
    deleteUser: async (_, { id }) => {
      try {
        const deletedUser = await UserAdminApp.deleteUser(id as UserId);
        return UserHelper.mapUserToGraphqlUser(deletedUser);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.DeleteUserError);
      }
    },

    editMeUser: async (_, { input }, context) => {
      try {
        return await userProfileApp.editMeUser(context.user, input);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.EditMeUserError);
      }
    },
    uploadUserPicture: async (_, { document }, context) => {
      try {
        return await userProfileApp.uploadUserPicture(context.user, document);
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.UploadUserPictureError);
      }
    },
    resetPassword: async (_, __) => {
      await UserDomain.resetPassword();
      return { success: true };
    },
    requestTransferPersonalSpace: async (_, { new_email }, context) => {
      try {
        await userProfileApp.requestTransferPersonalSpace(
          context.user,
          new_email
        );

        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.TransferMeError);
      }
    },
    transferPersonalSpace: async (_, { requestId }) => {
      try {
        await userProfileApp.transferPersonalSpace(
          requestId as UserTransferRequestId
        );

        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.TransferMeError);
      }
    },
    changeSelectedOrganization: async (
      _,
      { organization_id },
      portalContext
    ) => {
      try {
        const user =
          await UserOrganizationApp.changeSelectedOrganization(organization_id);

        portalContext.req.session.user = user;
        portalContext.req.session.save();
        portalContext.user = user;

        return UserHelper.mapUserToGraphqlUser(user);
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    removeUserFromOrganization: async (_, { user_id, organization_id }) => {
      try {
        const user = await UserOrganizationApp.removeUserFromOrganization({
          userId: user_id,
          organizationId: organization_id,
        });
        return UserHelper.mapUserToGraphqlUser(user);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RemoveUserFromOrgaError
        );
      }
    },
    bulkRemovePendingUserFromOrganization: async (
      _,
      { input },
      context: PortalContext
    ) => {
      try {
        const { ids, searchTerm, filters, excludedIds } = input;
        await UserAdminApp.bulkRemovePendingUserFromOrganization(
          context.user.selected_organization_id,
          ids ?? [],
          searchTerm ?? undefined,
          filters ?? [],
          excludedIds ?? []
        );

        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RemoveUserFromPendingOrgaError
        );
      }
    },
    bulkAcceptPendingUserInOrganization: async (
      _,
      { input },
      context: PortalContext
    ) => {
      try {
        const { ids, searchTerm, filters, excludedIds } = input;

        await UserAdminApp.bulkAcceptPendingUserInOrganization(
          context.user.selected_organization_id,
          ids ?? [],
          searchTerm ?? undefined,
          filters ?? [],
          excludedIds ?? []
        );
        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.AcceptUserInPendingOrgaError
        );
      }
    },
    acceptPendingUserInOrganization: async (
      _,
      { user_id, organization_id }
    ) => {
      try {
        const user = await UserOrganizationApp.acceptPendingUserInOrganization({
          userId: user_id,
          organizationId: organization_id,
        });

        if (!user) {
          return null;
        }

        return UserHelper.mapUserToGraphqlUser(user);
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.AcceptUserInPendingOrgaError
        );
      }
    },
    removePendingUserFromOrganization: async (
      _,
      { user_id, organization_id }
    ) => {
      try {
        const user =
          await UserOrganizationApp.removePendingUserFromOrganization({
            userId: user_id,
            organizationId: organization_id,
          });

        const graphQLUser = UserHelper.mapUserToGraphqlUser(user);
        await dispatch(
          'UserPending',
          'delete',
          {
            ...graphQLUser,
            pending_organization_id: organization_id,
          } as User,
          'User'
        );

        return graphQLUser;
      } catch (error) {
        throw mapToGraphQLError(
          error,
          UnknownErrorCode.RemoveUserFromPendingOrgaError
        );
      }
    },
    login: async (_, args, { req, res }) => {
      try {
        const loggedUser = await UserAuthApp.login(req, res, args);
        if (loggedUser) {
          return UserHelper.mapUserToGraphqlUser(loggedUser);
        }

        return undefined;
      } catch (error) {
        if (getErrorMessage(error).includes(ErrorCode.UserDisabled)) {
          throw ForbiddenAccess(ErrorCode.YouCanNotLogin);
        }

        throw mapToGraphQLError(error);
      }
    },
    logout: async (_, __, { user, req, res }) => {
      return UserAuthApp.logout(user, req, res);
    },
    contactUs: async (
      _,
      { message, platformIdentifier, platformId, deploymentRequestType },
      portalContext
    ) => {
      try {
        const platformToken = portalContext.req.header(
          'XTM-Hub-Platform-Token'
        );

        await hubspotReachOutSalesHook({
          message: message ?? undefined,
          platformToken,
          platformId: platformId ?? undefined,
          platformIdentifier: platformIdentifier ?? undefined,
          deploymentRequestType: deploymentRequestType ?? undefined,
        });
        return { success: true };
      } catch (error) {
        throw mapToGraphQLError(error, UnknownErrorCode.HubspotError);
      }
    },
  },
  Subscription: {
    User: {
      subscribe: (_, args, context, info) =>
        listen(context, ['User'], info, (payload: unknown) => {
          const typedPayload = payload as UserSubscription;
          if (!args.organizationId || typedPayload.merge) {
            return true;
          }
          const user =
            typedPayload.add ?? typedPayload.delete ?? typedPayload.edit;
          return (
            user?.organizations
              ?.map((org) => org.id)
              ?.includes(extractId(args.organizationId)) ?? false
          );
        }),
    },
    MeUser: {
      subscribe: (_, __, context, info) => listen(context, ['MeUser'], info),
    },
    UserPending: {
      subscribe: (_, args, context, info) =>
        listen(context, ['UserPending'], info, (payload: unknown) => {
          const typedPayload = payload as UserPendingSubscription;
          const organizationId = typedPayload.delete
            ? typedPayload.delete.pending_organization_id
            : typedPayload.invalidate?.id;
          return organizationId === extractId(args.organizationId);
        }),
    },
  },
};

export default resolvers;
