import User, { UserInitializer } from '../../../../model/kanel/public/User';
import {
  BadRequestErrorCode,
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
};
