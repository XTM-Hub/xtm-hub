import {
  AddUserInput,
  OrganizationCapability,
} from '../../../../__generated__/resolvers-types';
import portalConfig from '../../../../config';
import { withTransaction } from '../../../../context/database.context';
import { requestContext } from '../../../../context/request.context';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import { securityGuard } from '../../../../security/guard';
import {
  buildPendingUserActionLink,
  sendMail,
} from '../../../../server/mail-service';
import { logApp } from '../../../../utils/app-logger.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { formatName } from '../../../../utils/format';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserHelper } from '../user.helper';
import { UserOrganizationDomain } from './user-organization.domain';

export const UserOrganizationApp = {
  addUserToOrganization: async (
    input: AddUserInput
  ): Promise<UserLoadUserBy> => {
    const contextUser = requestContext.requireUser();

    const chosenOrganization = await OrganizationDomain.loadOrganizationBy({
      id: contextUser.selected_organization_id,
    });

    if (!chosenOrganization) {
      throw new Error(ErrorCode.OrganizationNotFound);
    }
    if (chosenOrganization.personal_space) {
      logApp.warn('You cannot add a user in your personal space');
      throw new Error(ErrorCode.CantAddUserToPersonalSpace);
    }

    await securityGuard.assertEmailMatchesOrganization(
      contextUser,
      input.email,
      chosenOrganization.id
    );

    const [existingUser] = await UserDomain.loadUser({ email: input.email });

    const { user, pendingRemoved } = await withTransaction(async () => {
      const user = existingUser
        ? existingUser
        : await UserProvisioningDomain.createUser({
            email: input.email,
            password: input.password ?? undefined,
            selected_organization_id: chosenOrganization.id,
          });

      await UserOrganizationDomain.createUserOrgCapabilities({
        user,
        organization: chosenOrganization,
        orgCapabilities: input.capabilities ?? [],
        userExists: !!existingUser,
      });

      const pendingRemoved = await UserHelper.removePending(
        user,
        chosenOrganization.id
      );

      return { user, pendingRemoved };
    });

    if (pendingRemoved) {
      await UserHelper.dispatchPendingDeleted(user, chosenOrganization.id);
    }

    const updatedUser = await UserDomain.loadUserBy({
      'User.id': user.id,
    });
    if (!updatedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }
    return updatedUser;
  },
  changeSelectedOrganization: async (
    organization_id: OrganizationId
  ): Promise<UserLoadUserBy> => {
    const user = requestContext.requireUser();

    await securityGuard.assertUserIsInOrganization(user, organization_id);

    const updatedUser = await UserDomain.updateUser(user.id, {
      selected_organization_id: organization_id,
    });
    if (!updatedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }
    const updatedUserLoadUserBy = await UserDomain.loadUserBy({
      'User.id': updatedUser.id,
    });
    if (!updatedUserLoadUserBy) {
      throw new Error(ErrorCode.UserNotFound);
    }
    requestContext.update({ user: updatedUserLoadUserBy });

    return updatedUserLoadUserBy;
  },

  removeUserFromOrganization: async ({
    userId,
    organizationId,
  }: {
    userId: UserId;
    organizationId: OrganizationId;
  }): Promise<UserLoadUserBy> => {
    const user = requestContext.requireUser();
    if (userId === user.id) {
      throw new Error(ErrorCode.CantRemoveYourselfFromOrgaError);
    }

    await UserOrganizationDomain.removeUserFromOrganization(
      userId,
      organizationId
    );
    const updatedUser = await UserDomain.loadUserBy({
      'User.id': userId,
    });
    if (!updatedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }
    return updatedUser;
  },

  removePendingUserFromOrganization: async ({
    userId,
    organizationId,
  }: {
    userId: UserId;
    organizationId: OrganizationId;
  }): Promise<UserLoadUserBy> => {
    await UserOrganizationPendingDomain.removeUserFromOrganizationPending(
      userId,
      organizationId
    );
    const user = await UserDomain.loadUserBy({
      'User.id': userId,
    });
    if (!user) {
      throw new Error(ErrorCode.UserNotFound);
    }
    return user;
  },

  acceptPendingUserInOrganization: async ({
    userId,
    organizationId,
  }: {
    userId: UserId;
    organizationId: OrganizationId;
  }): Promise<UserLoadUserBy | null> => {
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organizationId
    );

    await withTransaction(async () => {
      const pendingUser =
        await UserOrganizationPendingDomain.lockUserOrganizationPending(
          userId,
          organizationId
        );

      if (!pendingUser) {
        return;
      }

      await UserHelper.acceptPendingUserWithCapabilities({
        user_id: userId,
        organization_id: organizationId,
        orgCapabilities: [],
      });
    });

    const user = await UserDomain.loadUserBy({
      'User.id': userId,
      'Organization.id': organizationId,
    });

    return user ?? null;
  },

  sendPendingUsersDigest: async (): Promise<void> => {
    if (!portalConfig.enabled_emails.pending_user_digest) {
      logApp.info('Pending user digest email disabled.');
      return;
    }

    const cleanupPendingUser =
      await UserOrganizationPendingDomain.cleanupPendingUsers();

    if (cleanupPendingUser.totalDeleted > 0) {
      logApp.error(
        `[Cleanup] Removed ${cleanupPendingUser.totalDeleted} User_Organization_Pending records matching existing User_Organization entries`,
        cleanupPendingUser
      );
    }

    const organizationsWithPendingUsers =
      await UserOrganizationPendingDomain.loadOrganizationsWithPendingUsers();

    const promises = organizationsWithPendingUsers.map(async (organization) => {
      try {
        const adminUsers =
          await UserDomain.loadUsersByCapabilitiesInOrganization(
            organization.id,
            [OrganizationCapability.AdministrateOrganization]
          );

        return await Promise.all(
          adminUsers.map((adminUser) =>
            sendMail({
              to: adminUser.email,
              template: 'organization_pending_user_digest',
              params: {
                adminName: formatName(adminUser.first_name ?? ''),
                adminEmail: adminUser.email,
                organizationName: organization.name,
                users: organization.users
                  .sort((a, b) =>
                    (a.first_name ?? '').localeCompare(b.first_name ?? '')
                  )
                  .map(({ id, first_name, last_name, email }) => ({
                    firstName: formatName(first_name),
                    lastName: formatName(last_name),
                    email,
                    approveLink: buildPendingUserActionLink({
                      action: 'approve',
                      organizationId: organization.id,
                      userId: id,
                    }),
                    denyLink: buildPendingUserActionLink({
                      action: 'deny',
                      organizationId: organization.id,
                      userId: id,
                    }),
                  })),
                userCount: organization.users.length,
                requestLabel:
                  organization.users.length === 1 ? 'request' : 'requests',
              },
            })
          )
        );
      } catch (error) {
        logApp.error(
          `An error occurred while sending pending user digest to ${organization.name}`,
          { error }
        );
      }
    });

    await Promise.all(promises);
  },
};
