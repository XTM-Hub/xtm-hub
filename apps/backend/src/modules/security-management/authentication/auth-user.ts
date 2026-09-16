import type { Request, Response } from 'express';
import { UserInfo, UserLoadUserBy } from '../../../model/user';
import { PLATFORM_ORGANIZATION_UUID } from '../../../portal.const';
import { ErrorCode } from '../../../utils/error/error.code';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { isEmptyField } from '../../../utils/utils';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserOrganizationDomain } from '../../organization-management/user/user-organization/user-organization.domain';
import { UserProvisioningApp } from '../../organization-management/user/user-provisioning/user-provisioning.app';
import { RolePortalDomain } from '../../role-portal/role-portal.domain';

export const loginFromProvider = async (userInfo: UserInfo) => {
  // region test the groups existence and eventually auto create groups
  // endregion
  const { email } = userInfo;
  if (isEmptyField(email)) {
    throw ForbiddenAccess('User email not provided');
  }
  const isFiligranUser = email.endsWith('@filigran.io');

  const user = await UserProvisioningApp.getOrProvisionUser(userInfo, {
    upsert: true,
    isFiligranUser,
    sendWelcomeEmail: false,
  });
  if (!user) {
    throw new Error(ErrorCode.UserNotFound);
  }
  if (user.disabled) {
    throw ForbiddenAccess('You are not allowed to log in');
  }
  // Check if the user has the admin role, so in creation we create user then add admin role
  if (isFiligranUser) {
    await UserOrganizationDomain.ensureUserOrganizationExists(
      user.id,
      PLATFORM_ORGANIZATION_UUID
    );
    await RolePortalDomain.removeAllUserRolePortal(user.id);
    if (userInfo.roles.length > 0) {
      await Promise.all(
        userInfo.roles.map((role) =>
          RolePortalDomain.assignRoleByName(user.id, role)
        )
      );
      const reloadedUser = await UserDomain.loadUserBy({ 'User.id': user.id });
      if (!reloadedUser) {
        throw new Error(ErrorCode.UserNotFound);
      }
      return reloadedUser;
    }
  }

  return user;
};

export const authenticateUser = async (
  req: Request,
  res: Response,
  user: UserInfo
) => {
  const logged = await UserDomain.loadUserBy({ email: user.email });
  if (!logged || logged.disabled) {
    return;
  }
  req.session.user = await UserDomain.updateUserAtLogin(logged);
  req.session.save();
  res.cookie('NEXT_LOCALE', logged.selected_language);
  return logged;
};

/**
 * A session holds a snapshot of the user taken at login time, so it can claim
 * an account is active long after it was disabled or deleted. Any shortcut that
 * trusts the session instead of running the full provider flow must revalidate
 * against the database first.
 */
export const isSessionUserActive = async (
  sessionUser: UserLoadUserBy | undefined
): Promise<boolean> => {
  if (!sessionUser?.id) {
    return false;
  }
  const [user] = await UserDomain.loadUser({ id: sessionUser.id });
  return !!user && !user.disabled;
};
