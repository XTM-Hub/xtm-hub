import {
  AdminAddUserInput,
  AdminEditUserInput,
  EditUserCapabilitiesInput,
  Filter,
  OrganizationCapability,
} from '../../../../__generated__/resolvers-types';
import { withTransaction } from '../../../../context/database.context';
import { requestContext } from '../../../../context/request.context';
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import User, { UserId } from '../../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../../model/user';
import { PROTECTED_USER_UUIDS } from '../../../../portal.const';
import { dispatch } from '../../../../pub';
import { isUserAdminPlatform } from '../../../../security/access';
import { securityGuard } from '../../../../security/guard';
import {
  destroyUserSessions,
  updateUserSession,
} from '../../../../session-store-manager';
import { auth0Client } from '../../../../thirdparty/auth0/client';
import { logApp } from '../../../../utils/app-logger.util';
import { toError } from '../../../../utils/error/error-guard.util';
import { ErrorCode } from '../../../../utils/error/error.code';
import { ForbiddenAccess } from '../../../../utils/error/error.util';
import { stripNulls } from '../../../../utils/typescript';
import { DocumentDomain } from '../../../document/domain/document.domain';
import { EpicDomain } from '../../../xtm-platform-roadmap/epic.domain';
import { OrganizationDomain } from '../../organization/organization.domain';
import { UserDomain } from '../user-domain/user.domain';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user-provisioning/user-provisioning.domain';
import { UserHelper } from '../user.helper';
import { UserAdminGuard } from './user.admin.guard';

// PostgreSQL error code for foreign_key_violation
// (see https://www.postgresql.org/docs/current/errcodes-appendix.html).
const FOREIGN_KEY_VIOLATION_CODE = '23503';

const isForeignKeyViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === FOREIGN_KEY_VIOLATION_CODE;

export const UserAdminApp = {
  addUser: async (input: AdminAddUserInput): Promise<UserLoadUserBy> => {
    const contextUser = requestContext.requireUser();
    // In most of the case there will be only one organization in the list, but in case where the scenario is an admin pltfm it can be multiple or none
    const chosenOrganizationId: OrganizationId | undefined = input
      .organization_capabilities?.[0]
      ? input.organization_capabilities?.[0].organization_id
      : undefined;

    await securityGuard.assertEmailMatchesOrganization(
      contextUser,
      input.email,
      chosenOrganizationId
    );

    const [existingUser] = await UserDomain.loadUser({ email: input.email });

    const organizationsWithRemovedPending: OrganizationId[] = [];

    const finalUser = await withTransaction(async () => {
      const user = existingUser
        ? existingUser
        : await UserProvisioningDomain.createUser({
            email: input.email,
            password: input.password,
            first_name: input.first_name,
            last_name: input.last_name,
            selected_organization_id: chosenOrganizationId,
          });

      await UserOrganizationDomain.updateMultipleUserOrgWithCapabilities(
        user.id,
        input.organization_capabilities
      );

      for (const orgCapa of input.organization_capabilities ?? []) {
        if (await UserHelper.removePending(user, orgCapa.organization_id)) {
          organizationsWithRemovedPending.push(orgCapa.organization_id);
        }
      }

      return await UserDomain.loadUserBy({
        'User.id': user.id,
      });
    });

    if (!finalUser) {
      throw new Error(ErrorCode.UserNotFound);
    }

    await Promise.all(
      organizationsWithRemovedPending.map((organizationId) =>
        UserHelper.dispatchPendingDeleted(finalUser, organizationId)
      )
    );

    await dispatch('User', 'add', finalUser);

    return finalUser;
  },
  editUser: async ({
    userId,
    input,
  }: {
    userId: UserId;
    input: AdminEditUserInput;
  }) => {
    const contextUser = requestContext.requireUser();
    if (!isUserAdminPlatform(contextUser)) {
      await securityGuard.assertUserCapabilities(
        [
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManageAccess,
        ],
        contextUser.selected_organization_id
      );
      const targetUser = await UserDomain.loadUserBy({ 'User.id': userId });
      if (!targetUser) {
        throw new Error(ErrorCode.UserNotFound);
      }
      await securityGuard.assertUserIsInOrganization(
        targetUser,
        contextUser.selected_organization_id
      );

      const unauthorizedOrg = (input.organization_capabilities ?? []).find(
        (orgCapa) =>
          orgCapa.organization_id !== contextUser.selected_organization_id
      );
      if (unauthorizedOrg) {
        throw ForbiddenAccess(ErrorCode.MissingCapabilityOnOrganization);
      }
    }
    const { organization_capabilities, ...userInput } = input;
    const mappedCapabilities = (organization_capabilities ?? []).map(
      (orgCapability) => ({
        organizationId: orgCapability.organization_id,
        capabilities: orgCapability.capabilities,
      })
    );
    if (!input.disabled) {
      await UserHelper.preventAdministratorRemovalOfAllOrganizations(
        userId,
        mappedCapabilities
      );
    }
    const updatedUser = await UserDomain.updateUser(
      userId,
      stripNulls(userInput)
    );
    if (updatedUser) {
      try {
        await auth0Client.updateUser({
          ...stripNulls(input),
          email: updatedUser.email,
        });
      } catch (err) {
        logApp.error(toError(err));
      }
    }
    await UserOrganizationDomain.updateMultipleUserOrgWithCapabilities(
      userId,
      organization_capabilities
    );
    const user = await UserDomain.loadUserDetails({
      'User.id': userId,
    });
    await Promise.all(
      (organization_capabilities ?? []).map((orgCapa) =>
        UserHelper.removePendingAndDispatch(user, orgCapa.organization_id)
      )
    );
    updateUserSession(user);

    const userMapped = UserHelper.mapUserToGraphqlUser(user);

    await dispatch('User', 'edit', user);
    await dispatch('MeUser', 'edit', userMapped, 'User');

    if (updatedUser && input.disabled) {
      await dispatch('User', 'delete', updatedUser);
      await dispatch('MeUser', 'delete', updatedUser, 'User');
    }

    return user;
  },

  editUserCapabilities: async ({
    userId,
    input,
  }: {
    userId: UserId;
    input: EditUserCapabilitiesInput;
  }) => {
    const user = requestContext.requireUser();
    const organizationId = user.selected_organization_id;
    await UserHelper.preventAdministratorRemovalOfOneOrganization(
      userId,
      organizationId,
      input.capabilities
    );

    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        user_id: userId,
        organization_id: organizationId,
      });

    return userOrganization
      ? await UserHelper.updateUserOrgCapabilitiesAndDispatch({
          user_id: userId,
          organization_id: organizationId,
          orgCapabilities: input.capabilities,
        })
      : await UserHelper.acceptPendingUserWithCapabilities({
          user_id: userId,
          organization_id: organizationId,
          orgCapabilities: input.capabilities,
        });
  },

  bulkAcceptPendingUserInOrganization: async (
    organizationId: OrganizationId,
    ids: UserId[],
    searchTerm: string | undefined,
    filters: Filter[],
    excludedIds: UserId[]
  ) => {
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organizationId
    );

    const userIds =
      await UserOrganizationPendingDomain.bulkLoadUserIdsFromOrganizationPending(
        organizationId,
        ids,
        searchTerm,
        filters,
        excludedIds
      );

    await Promise.all(
      userIds.map(async (userId: UserId) => {
        try {
          await UserHelper.acceptPendingUserWithCapabilities({
            user_id: userId,
            organization_id: organizationId,
            orgCapabilities: [],
          });
        } catch (error) {
          logApp.error('Error while accepting user in organization', {
            error,
            userId,
            organizationId,
          });
        }
      })
    );
  },

  bulkRemovePendingUserFromOrganization: async (
    organizationId: OrganizationId,
    ids: UserId[],
    searchTerm: string | undefined,
    filters: Filter[],
    excludedIds: UserId[]
  ) => {
    await securityGuard.assertUserCapabilities(
      [
        OrganizationCapability.AdministrateOrganization,
        OrganizationCapability.ManageAccess,
      ],
      organizationId
    );

    await UserOrganizationPendingDomain.bulkRemoveUserFromOrganizationPending(
      organizationId,
      ids,
      searchTerm,
      filters,
      excludedIds
    );
    await dispatch('UserPending', 'invalidate', {
      id: organizationId,
    });
  },

  deleteUser: async (userId: UserId): Promise<User> => {
    const contextUser = requestContext.requireUser();
    if (contextUser.id === userId) {
      throw new Error(ErrorCode.CantDeleteYourself);
    }

    if (PROTECTED_USER_UUIDS.includes(userId)) {
      throw new Error(ErrorCode.CantDeleteBuiltinUser);
    }

    const [user] = await UserDomain.loadUser({ id: userId });
    if (!user) {
      throw new Error(ErrorCode.UserNotFound);
    }

    const personalSpaceId = userId as unknown as OrganizationId;

    await UserAdminGuard.assertUserHasNoTransferRequest(userId);
    await UserAdminGuard.assertUserHasNoDeploymentRequest(userId);
    await UserAdminGuard.assertUserHasNoCancellationRecord(userId);
    await UserAdminGuard.assertUserHasNoPlatformRegistration(userId);
    await UserAdminGuard.assertUserIsNotLastOrganizationMember(userId);
    await UserAdminGuard.assertUserIsNotLastOrganizationAdministrator(userId);
    await UserAdminGuard.assertPersonalSpaceHasNoPendingUsers(personalSpaceId);

    const { deletedUser, deletedPersonalSpace } = await withTransaction(
      async () => {
        // Re-validate the invariants above under row locks, immediately
        // before the destructive operations: another request may have
        // changed the relevant organizations' membership between the
        // checks above and now.
        await UserAdminGuard.relockAndRevalidateDeletionInvariants(
          userId,
          personalSpaceId
        );

        await DocumentDomain.reassignUserDocumentsToSystemUser(userId);
        await EpicDomain.reassignUserEpicsToSystemUser(userId);

        // The User row must be removed first: User.selected_organization_id
        // references Organization.id without a cascade.
        const removedUser = await UserDomain.deleteUserBy({ id: userId });
        if (!removedUser) {
          throw new Error(ErrorCode.UserNotFound);
        }

        const removedPersonalSpace =
          await OrganizationDomain.deleteOrganizationBy({
            id: personalSpaceId,
          });

        return {
          deletedUser: removedUser,
          deletedPersonalSpace: removedPersonalSpace,
        };
      }
    ).catch((error: unknown) => {
      if (isForeignKeyViolation(error)) {
        logApp.warn('User deletion blocked by a foreign key constraint', {
          userId,
          error,
        });
        throw new Error(ErrorCode.DeleteUserBlockedByLinkedData);
      }
      throw error;
    });

    await destroyUserSessions(userId);
    await UserHelper.deleteUserPicture(user.picture_minio);

    // The user and its personal space are already deleted at this point:
    // a dispatch failure (e.g. a downstream subscriber error) must not be
    // reported as a failed deletion.
    try {
      await dispatch('User', 'delete', deletedUser);
      await dispatch('MeUser', 'delete', deletedUser, 'User');
      if (deletedPersonalSpace) {
        await dispatch('Organization', 'delete', deletedPersonalSpace);
      }
    } catch (error) {
      logApp.error('Error dispatching user deletion events', {
        userId,
        error,
      });
    }

    logApp.info('User deleted', {
      userId,
      deletedPersonalSpaceId: deletedPersonalSpace?.id ?? null,
    });

    return deletedUser;
  },
};
