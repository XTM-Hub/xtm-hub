import {
  AddUserInput,
  OrganizationCapability,
} from '../../../../__generated__/resolvers-types';
import portalConfig from '../../../../config';
import { withTransaction } from '../../../../context/database.context';
import { requestContext } from '../../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import { dispatch } from '../../../../pub';
import { securityGuard } from '../../../../security/guard';
import {
  buildPendingUserActionLink,
  sendMail,
} from '../../../../server/mail-service';
import { updateUserSession } from '../../../../session-store-manager';
import { logApp } from '../../../../utils/app-logger.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { formatName } from '../../../../utils/format';
import { isValidEmail } from '../../../../utils/verify-email.util';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningApp } from '../user-provisioning/user-provisioning.app';
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

    await UserOrganizationApp.assertUserCanBeAddedToOrganization({
      organization: chosenOrganization,
      email: input.email,
    });
    return UserOrganizationApp.provisionOrganizationUser({
      organization: chosenOrganization,
      ...input,
    });
  },

  assertUserCanBeAddedToOrganization: async ({
    organization,
    email,
  }: {
    organization: Organization;
    email: string;
  }): Promise<void> => {
    if (organization.personal_space) {
      logApp.warn('You cannot add a user in your personal space');
      throw new Error(ErrorCode.CantAddUserToPersonalSpace);
    }

    await securityGuard.assertEmailMatchesOrganization(
      requestContext.requireUser(),
      email,
      organization.id
    );
  },

  provisionOrganizationUser: async ({
    organization,
    email,
    password,
    capabilities,
  }: AddUserInput & {
    organization: Organization;
  }): Promise<UserLoadUserBy> => {
    return UserProvisioningApp.provisionUserForOrganizations({
      userData: {
        email,
        password,
        selected_organization_id: organization.id,
      },
      orgCapabilities: [
        {
          organization_id: organization.id,
          capabilities: capabilities ?? [],
        },
      ],
      mode: 'add',
      organizationForWelcomeEmail: organization,
    });
  },

  resolveOrganizationUserIdsByEmails: async ({
    organization,
    emails,
  }: {
    organization: Organization;
    emails: string[];
  }): Promise<UserId[]> => {
    // Every email is checked first: adding a user sends emails a rollback cannot undo
    const memberIds: UserId[] = [];
    const emailsToProvision: string[] = [];
    for (const email of emails) {
      if (!isValidEmail(email)) {
        throw new Error(ErrorCode.InvalidEmail);
      }
      const [existingUser] = await UserDomain.loadUser({ email });
      if (existingUser?.disabled) {
        throw new Error(ErrorCode.UserDisabled);
      }
      const [membership] = existingUser
        ? await UserOrganizationDomain.loadUserOrganization({
            user_id: existingUser.id,
            organization_id: organization.id,
          })
        : [];
      if (existingUser && membership) {
        // Provisioning would reset the member capabilities
        memberIds.push(existingUser.id);
        continue;
      }

      await UserOrganizationApp.assertUserCanBeAddedToOrganization({
        organization,
        email,
      });
      emailsToProvision.push(email);
    }

    const provisionedUserIds: UserId[] = [];
    for (const email of emailsToProvision) {
      const provisionedUser =
        await UserOrganizationApp.provisionOrganizationUser({
          organization,
          email,
        });
      provisionedUserIds.push(provisionedUser.id);
    }
    return [...memberIds, ...provisionedUserIds];
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

    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organizationId
    );

    const organization = await OrganizationDomain.loadOrganizationBy({
      id: organizationId,
    });
    if (organization?.personal_space) {
      throw new Error(ErrorCode.CantRemoveUserFromPersonalSpace);
    }

    // No lock on purpose: two simultaneous removals of the last administrators are unlikely enough to accept the race
    await UserHelper.preventAdministratorRemovalOfOneOrganization(
      userId,
      organizationId
    );
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
    await updateUserSession(updatedUser);
    await dispatch(
      'MeUser',
      'edit',
      UserHelper.mapUserToGraphqlUser(updatedUser),
      'User'
    );
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
