import type { Request, Response } from 'express';
import portalConfig from '../../../config';
import {
  ProviderUserInfo,
  UserInfo,
  UserLoadUserBy,
} from '../../../model/user';
import {
  PLATFORM_DOMAIN,
  PLATFORM_IDP_GROUP,
  PLATFORM_ORGANIZATION_UUID,
} from '../../../portal.const';
import { AppLogsCategory, logApp } from '../../../utils/app-logger.util';
import { ErrorCode, ForbiddenErrorCode } from '../../../utils/error/error.code';
import { ForbiddenAccess } from '../../../utils/error/error.util';
import { startUserSession } from '../../../utils/session.util';
import { isEmptyField } from '../../../utils/utils';
import { extractDomain } from '../../../utils/verify-email.util';
import { ServiceGroupApp } from '../../deployment/group/service-group.app';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserOrganizationDomain } from '../../organization-management/user/user-organization/user-organization.domain';
import { UserProvisioningApp } from '../../organization-management/user/user-provisioning/user-provisioning.app';
import { RolePortalDomain } from '../../role-portal/role-portal.domain';

/**
 * Accounts are still matched by email. The IdP subject recorded at the first
 * sign-in tells whether the same IdP account is coming back: a mismatch means
 * another IdP account claims this email, or this IdP account claims another
 * email. Mismatches are only logged until `enforce_idp_subject` is turned on.
 */
const checkIdpSubject = async (
  email: string,
  idpSubject: string
): Promise<boolean> => {
  const [[userByEmail], [userBySubject]] = await Promise.all([
    UserDomain.loadUser({ email }),
    UserDomain.loadUser({ idp_subject: idpSubject }),
  ]);
  const matches =
    (!userByEmail?.idp_subject || userByEmail.idp_subject === idpSubject) &&
    (!userBySubject || userBySubject.id === userByEmail?.id);
  if (matches) {
    return true;
  }

  logApp.warn(
    'IdP subject does not match the account',
    {
      userId: userByEmail?.id,
      subjectUserId: userBySubject?.id,
      idpSubject,
    },
    AppLogsCategory.LOGIN_PROVIDER
  );
  if (portalConfig.user_management.enforce_idp_subject) {
    throw ForbiddenAccess(ForbiddenErrorCode.IdpSubjectMismatch);
  }
  return false;
};

const isFiligranEmail = (email: string): boolean =>
  PLATFORM_DOMAIN.includes(extractDomain(email.toLowerCase()) ?? '');

/**
 * Every Filigran account carries the Filigran group, so a Filigran email
 * without it is an account that should no longer be used: it is refused, and
 * an existing account loses its Hub roles.
 */
const refuseFiligranEmailOutsideGroup = async (
  email: string,
  idpSubject: string
): Promise<never> => {
  const [user] = await UserDomain.loadUser({ email });
  if (user) {
    await RolePortalDomain.removeAllUserRolePortal(user.id);
  }
  logApp.warn(
    'Sign-in refused: Filigran email without the Filigran group',
    { userId: user?.id, idpSubject },
    AppLogsCategory.LOGIN_PROVIDER
  );
  throw ForbiddenAccess(ForbiddenErrorCode.FiligranGroupMissing);
};

export const loginFromProvider = async (userInfo: ProviderUserInfo) => {
  // region test the groups existence and eventually auto create groups
  // endregion
  const { email, idp_subject } = userInfo;
  if (isEmptyField(email)) {
    throw ForbiddenAccess('User email not provided');
  }
  if (isEmptyField(idp_subject)) {
    throw ForbiddenAccess(ForbiddenErrorCode.IdpSubjectNotProvided);
  }
  // Membership of the Filigran organisation comes from the IdP group that
  // Filigran IT manages, never from the email domain.
  const isFiligranUser = userInfo.groups.includes(PLATFORM_IDP_GROUP);
  if (!isFiligranUser && isFiligranEmail(email)) {
    await refuseFiligranEmailOutsideGroup(email, idp_subject);
  }
  const idpSubjectMatches = await checkIdpSubject(email, idp_subject);

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
  if (idpSubjectMatches) {
    if (!user.idp_subject) {
      await UserDomain.updateUser(
        user.id,
        { idp_subject },
        { idp_subject: null }
      );
    }
    // A concurrent sign-in may have bound this account after the initial check.
    await checkIdpSubject(email, idp_subject);
  }
  if (isFiligranUser) {
    await UserOrganizationDomain.ensureUserOrganizationExists(
      user.id,
      PLATFORM_ORGANIZATION_UUID
    );
    // An earlier sign-in without the group left the account pending
    await UserOrganizationDomain.removeUserFromPendingList({
      user_id: user.id,
      organization_id: PLATFORM_ORGANIZATION_UUID,
    });
  }
  // Hub roles are reset from the IdP at every sign-in, for every account, so
  // they never outlive the Filigran group.
  await RolePortalDomain.removeAllUserRolePortal(user.id);
  const roles = isFiligranUser ? userInfo.roles : [];
  if (roles.length > 0) {
    await Promise.all(
      roles.map((role) => RolePortalDomain.assignRoleByName(user.id, role))
    );
    const reloadedUser = await UserDomain.loadUserBy({ 'User.id': user.id });
    if (!reloadedUser) {
      throw new Error(ErrorCode.UserNotFound);
    }
    return reloadedUser;
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
  const updatedUser = await UserDomain.updateUserAtLogin(logged);
  // The grant clears the pending status on the user, so the session snapshot
  // is only written once it is done.
  await ServiceGroupApp.grantAccessAtLogin(updatedUser);
  await startUserSession(req, updatedUser);

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
