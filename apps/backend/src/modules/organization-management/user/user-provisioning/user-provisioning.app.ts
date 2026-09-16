import User, { UserInitializer } from '../../../../model/kanel/public/User';
import { isEmpty } from '../../../../utils/utils';
import { UserDomain } from '../user-domain/user.domain';
import { UserHelper } from '../user.helper';

interface GetOrProvisionUserOptions {
  upsert?: boolean;
  isFiligranUser?: boolean;
  sendWelcomeEmail?: boolean;
}

export const UserProvisioningApp = {
  getOrProvisionUser: async (
    userInfo: Pick<
      UserInitializer,
      'email' | 'first_name' | 'last_name' | 'picture'
    >,
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
      : await UserHelper.createNewUserFromInvitation(userInfo, {
          isFiligranUser,
          sendWelcomeEmail,
        });
  },
};
