import { OrganizationCapability } from '../../../../__generated__/resolvers-types';
import { withTransaction } from '../../../../context/database.context';
import { requestContext } from '../../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import User, { UserInitializer } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import { dispatch } from '../../../../pub';
import { securityGuard } from '../../../../security/guard';
import { sendMail } from '../../../../server/mail-service';
import {
  BadRequestErrorCode,
  ErrorCode,
  UnknownErrorCode,
} from '../../../../utils/error/error.code';
import {
  BadRequestError,
  UnknownError,
} from '../../../../utils/error/error.util';
import { isEmpty } from '../../../../utils/utils';
import { extractDomain } from '../../../../utils/verify-email.util';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';
import { UserHelper } from '../user.helper';
import { UserProvisioningDomain } from './user-provisioning.domain';

type UserProfile = Pick<
  UserInitializer,
  'email' | 'first_name' | 'last_name' | 'picture'
>;

interface GetOrProvisionUserOptions {
  upsert?: boolean;
  isFiligranUser?: boolean;
  sendWelcomeEmail?: boolean;
}

interface AutoProvisionNewUserOptions {
  isFiligranUser?: boolean;
  sendWelcomeEmail?: boolean;
}

export const UserProvisioningApp = {
  getOrProvisionUser: async (
    userInfo: UserProfile,
    {
      upsert = false,
      isFiligranUser = false,
      sendWelcomeEmail = true,
    }: GetOrProvisionUserOptions = {}
  ): Promise<User> => {
    const user = await UserDomain.loadUserBy({ email: userInfo.email });
    if (user && upsert) {
      const updatedUser = await UserDomain.updateUser(user.id, {
        last_login: new Date(),
        first_name: isEmpty(user.first_name)
          ? userInfo.first_name
          : user.first_name,
        last_name: isEmpty(user.last_name)
          ? userInfo.last_name
          : user.last_name,
        picture: isEmpty(user.picture) ? userInfo.picture : user.picture,
      });
      return updatedUser ?? user;
    }
    return user
      ? user
      : await UserProvisioningApp.autoProvisionNewUser(userInfo, {
          isFiligranUser,
          sendWelcomeEmail,
        });
  },

  autoProvisionNewUser: async (
    { email, first_name, last_name, picture }: UserProfile,
    {
      isFiligranUser = false,
      sendWelcomeEmail = true,
    }: AutoProvisionNewUserOptions = {}
  ): Promise<User> => {
    const [organization] =
      await OrganizationDomain.loadOrganizationsFromEmail(email);

    if (!organization && !extractDomain(email)) {
      throw BadRequestError(BadRequestErrorCode.InvalidEmail);
    }

    const addedUser = await UserProvisioningDomain.createUser(
      { email, first_name, last_name, picture },
      { sendWelcomeEmail }
    );

    if (!organization) {
      await UserProvisioningDomain.linkUserAsNewOrganizationAdmin(
        addedUser,
        email
      );
    } else if (!isFiligranUser) {
      await UserProvisioningDomain.linkUserToPendingOrganization(
        addedUser,
        organization
      );
    }

    const user = await UserDomain.loadUserBy({ 'User.id': addedUser.id });
    if (!user) {
      throw UnknownError(UnknownErrorCode.AddingUserError);
    }
    return user;
  },

  provisionUserForOrganizations: async ({
    userData,
    orgCapabilities,
    mode,
    organizationForWelcomeEmail,
  }: {
    userData: {
      email: string;
      password?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      selected_organization_id?: OrganizationId;
    };
    orgCapabilities: {
      organization_id: OrganizationId;
      capabilities?: string[] | null;
    }[];
    mode: 'replace' | 'add';
    organizationForWelcomeEmail?: Organization;
  }): Promise<UserLoadUserBy> => {
    const { user, organizationsWithRemovedPending } = await withTransaction(
      async () => {
        for (const { organization_id } of orgCapabilities) {
          await securityGuard.assertUserCapabilities(
            [
              OrganizationCapability.AdministrateOrganization,
              OrganizationCapability.ManageAccess,
            ],
            organization_id
          );
        }

        const { user, existed } =
          await UserProvisioningDomain.findOrCreateUser(userData);

        await UserOrganizationDomain.assignUserOrgCapabilities({
          userId: user.id,
          orgCapabilities,
          mode,
        });

        if (existed && organizationForWelcomeEmail) {
          const contextUser = requestContext.requireUser();
          await sendMail({
            to: user.email,
            template: 'new_user_organization',
            params: {
              organizationName: organizationForWelcomeEmail.name,
              userName: `${contextUser.first_name ?? ''} ${contextUser.last_name ?? ''}`,
              invitedName: `${user.first_name ?? ''} ${user.last_name ?? ''}`,
            },
          });
        }

        const organizationsWithRemovedPending: OrganizationId[] = [];
        for (const { organization_id } of orgCapabilities) {
          if (await UserHelper.removePending(user, organization_id)) {
            organizationsWithRemovedPending.push(organization_id);
          }
        }

        const reloadedUser = await UserDomain.loadUserBy({
          'User.id': user.id,
        });
        if (!reloadedUser) {
          throw new Error(ErrorCode.UserNotFound);
        }

        return {
          user: reloadedUser,
          organizationsWithRemovedPending,
        };
      }
    );

    await UserHelper.dispatchPendingDeletedForOrganizations(
      user,
      organizationsWithRemovedPending
    );
    await dispatch('User', 'add', user);

    return user;
  },
};
