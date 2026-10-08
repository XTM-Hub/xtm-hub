import type { Management } from 'auth0';
import {
  AddUsersToBundleGroupsInput,
  BundleUserServiceGroup,
  FeatureFlag,
  PlatformIdentifier,
  ServiceGroupName,
  ServiceGroup as ServiceGroupResponse,
  UpdateBundleUserGroupsInput,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import DeploymentRequest from '../../../model/kanel/public/DeploymentRequest';
import ServiceGroup, {
  ServiceGroupId,
} from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../model/user';
import { logApp } from '../../../utils/app-logger.util';
import { getErrorMessage } from '../../../utils/error/error-guard.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { isFeatureEnabled } from '../../../utils/feature-flag.util';
import { normalizeEmails } from '../../../utils/verify-email.util';
import { OrganizationDomain } from '../../organization-management/organization/organization.domain';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UserOrganizationApp } from '../../organization-management/user/user-organization/user-organization.app';
import { UserProvisioningDomain } from '../../organization-management/user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../../organization-management/user/user.helper';
import { DeploymentRequestDomain } from '../deployment.domain';
import { ServiceGroupDomain } from './service-group.domain';
import {
  ServiceGroupHelper,
  TrialAccessTelemetryContext,
} from './service-group.helper';
import { ServiceGroupSecurityHelper } from './service-group.security.helper';

export type UpdateGroupsPayload = { id: ServiceGroupId; userIds: UserId[] }[];

const MAX_INVITED_EMAILS = 50;

export const ServiceGroupApp = {
  loadGroups: async ({
    serviceInstanceId,
  }: {
    serviceInstanceId: ServiceInstanceId;
  }): Promise<ServiceGroupResponse[]> => {
    const serviceGroups = await ServiceGroupDomain.loadServiceGroups({
      service_instance_id: serviceInstanceId,
    });
    return serviceGroups.map(ServiceGroupHelper.toServiceGroupResponse);
  },

  loadGroupUsers: async (groupId: ServiceGroupId): Promise<User[]> => {
    return ServiceGroupDomain.loadGroupUsers(groupId);
  },

  loadGroupsByServiceInstanceAndUser: async (
    serviceInstanceId: ServiceInstanceId,
    userId: UserId
  ): Promise<ServiceGroupResponse[]> => {
    const serviceGroups =
      await ServiceGroupDomain.loadServiceGroupsByServiceInstanceAndUser(
        serviceInstanceId,
        userId
      );
    return serviceGroups.map(ServiceGroupHelper.toServiceGroupResponse);
  },

  loadBundleUserServiceGroups: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<BundleUserServiceGroup[]> => {
    const { bundleDeploymentRequest } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoad(
        serviceInstanceId
      );

    const rows = await UserDomain.loadUsersWithDeploymentServiceGroups(
      bundleDeploymentRequest.id
    );

    const bundleUserServiceGroupsByUserId = new Map<
      UserId,
      BundleUserServiceGroup
    >();
    rows.forEach(({ platform_identifier, group_name, ...rowUser }) => {
      if (!platform_identifier) {
        return;
      }
      const entry: BundleUserServiceGroup = bundleUserServiceGroupsByUserId.get(
        rowUser.id
      ) ?? {
        user: rowUser,
        groups: [],
      };
      entry.groups.push({
        platformIdentifier: platform_identifier,
        name: group_name,
      });
      bundleUserServiceGroupsByUserId.set(rowUser.id, entry);
    });

    return Array.from(bundleUserServiceGroupsByUserId.values());
  },

  loadBundleProducts: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<PlatformIdentifier[]> => {
    const { children } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    return children.flatMap((child) =>
      child.platform_identifier ? [child.platform_identifier] : []
    );
  },

  addUsersToBundleGroups: async (
    serviceInstanceId: ServiceInstanceId,
    input: AddUsersToBundleGroupsInput
  ): Promise<BundleUserServiceGroup[]> => {
    const user = requestContext.requireUser();

    if (
      !input.roles.some((role) => role.product === PlatformIdentifier.Xtmone)
    ) {
      throw new Error(ErrorCode.XtmOneRoleRequired);
    }

    const isTrialInviteEnabled = isFeatureEnabled(FeatureFlag.TrialInvite);
    const emails = isTrialInviteEnabled
      ? normalizeEmails(input.emails ?? [])
      : [];
    if (emails.length > MAX_INVITED_EMAILS) {
      throw new Error(ErrorCode.TooManyEmails);
    }

    const { bundleDeploymentRequest, children, bundleOrganizationId } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    await ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
      input.userIds,
      bundleOrganizationId
    );

    const platformRoleAssignments = ServiceGroupHelper.matchRolesToChildren(
      children,
      ServiceGroupHelper.uniqueRolesByProduct(input.roles)
    );

    const organization = await OrganizationDomain.loadOrganizationBy({
      id: bundleOrganizationId,
    });

    const { users, emailByUserId, insertedUserIds } = await withTransaction(
      async () => {
        const groupAssignments: {
          child: DeploymentRequest;
          role: ServiceGroupName | null;
          targetGroup: ServiceGroup;
        }[] = [];
        for (const { child, role } of platformRoleAssignments) {
          const groups = await ServiceGroupDomain.loadServiceGroups({
            service_instance_id: child.service_instance_id,
          });
          const targetGroup = groups.find((group) => group.name === role);
          if (!targetGroup) {
            throw new Error(ErrorCode.ServiceGroupNotFound);
          }
          groupAssignments.push({ child, role, targetGroup });
        }

        let invitedUserIds: UserId[] = [];
        if (emails.length > 0) {
          if (!organization) {
            throw new Error(ErrorCode.OrganizationNotFound);
          }
          invitedUserIds =
            await UserOrganizationApp.resolveOrganizationUserIdsByEmails({
              organization,
              emails,
            });
        }
        const userIds = [...new Set([...input.userIds, ...invitedUserIds])];

        const { users: loadedUsers, emailByUserId } =
          await ServiceGroupHelper.loadEmailByUserId(userIds);
        const users: User[] = [];
        for (const loadedUser of loadedUsers) {
          users.push(
            isTrialInviteEnabled &&
              loadedUser.status === UserAccountStatus.Expired
              ? await UserProvisioningDomain.reinviteExpiredUser(loadedUser)
              : loadedUser
          );
        }
        const telemetryContext: TrialAccessTelemetryContext = {
          organization,
          actorUserId: user.id,
          emailByUserId,
        };

        const inserted = new Set<UserId>();
        for (const { child, role, targetGroup } of groupAssignments) {
          const insertedInGroup = await ServiceGroupDomain.addUsersToGroup(
            targetGroup.id,
            userIds
          );
          insertedInGroup.forEach((userId) => inserted.add(userId));

          await ServiceGroupHelper.sendTrialAccessTelemetry(telemetryContext, {
            deploymentId: child.id,
            role,
            userIds: insertedInGroup,
          });
        }

        return { users, emailByUserId, insertedUserIds: inserted };
      }
    );

    const grantedAssignments = platformRoleAssignments.filter(
      ({ child, role }) => child.platform_identifier && role
    );
    // Users without an Auth0 account get it synced at their first login
    const usersWithAuth0Account = users.filter(UserHelper.hasAuth0Account);

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      grantedAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      usersWithAuth0Account.map(({ id }) => id),
      emailByUserId
    );

    await ServiceGroupHelper.sendFreeTrialBundleWelcomeEmails({
      endDate: bundleDeploymentRequest.end_date,
      products: grantedAssignments.flatMap(({ child }) =>
        child.platform_identifier ? [child.platform_identifier] : []
      ),
      newlyAddedUsers: usersWithAuth0Account.filter((addedUser) =>
        insertedUserIds.has(addedUser.id)
      ),
      adminEmail: user.email,
    });

    return ServiceGroupApp.loadBundleUserServiceGroups(serviceInstanceId);
  },

  removeUsersFromBundleGroups: async (
    serviceInstanceId: ServiceInstanceId,
    userIds: UserId[]
  ): Promise<UserId[]> => {
    const user = requestContext.requireUser();

    const { children, bundleOrganizationId } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    const groups =
      await ServiceGroupDomain.loadServiceGroupsByServiceInstanceIds(
        children.map((child) => child.service_instance_id)
      );
    const allGroupIds = groups.map((group) => group.id);
    const serviceInstanceIdByGroupId = new Map(
      groups.map((group) => [group.id, group.service_instance_id])
    );

    const removedMemberships =
      await ServiceGroupDomain.removeUsersFromServiceGroups(
        userIds,
        allGroupIds
      );

    const { users, emailByUserId } =
      await ServiceGroupHelper.loadEmailByUserId(userIds);
    const telemetryContext: TrialAccessTelemetryContext = {
      organization: await OrganizationDomain.loadOrganizationBy({
        id: bundleOrganizationId,
      }),
      actorUserId: user.id,
      emailByUserId,
    };

    for (const child of children) {
      await ServiceGroupHelper.sendTrialAccessTelemetry(telemetryContext, {
        deploymentId: child.id,
        role: null,
        userIds: [
          ...new Set(
            removedMemberships
              .filter(
                ({ group_id }) =>
                  serviceInstanceIdByGroupId.get(group_id) ===
                  child.service_instance_id
              )
              .map(({ user_id }) => user_id)
          ),
        ],
      });
    }

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      children.map((child) => ({ child, groupNames: [] })),
      users.filter(UserHelper.hasAuth0Account).map(({ id }) => id),
      emailByUserId
    );

    return userIds;
  },

  updateBundleUserGroups: async (
    serviceInstanceId: ServiceInstanceId,
    input: UpdateBundleUserGroupsInput
  ): Promise<BundleUserServiceGroup[]> => {
    const user = requestContext.requireUser();

    const xtmOneRoleAssignment = input.roles.find(
      (role) => role.product === PlatformIdentifier.Xtmone
    );
    if (xtmOneRoleAssignment && !xtmOneRoleAssignment.role) {
      throw new Error(ErrorCode.XtmOneRoleRequired);
    }

    const { children, bundleOrganizationId } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    await ServiceGroupSecurityHelper.assertUsersBelongToOrganization(
      input.userIds,
      bundleOrganizationId
    );

    const platformRoleAssignments = ServiceGroupHelper.matchRolesToChildren(
      children,
      input.roles
    );

    const { users, emailByUserId } = await ServiceGroupHelper.loadEmailByUserId(
      input.userIds
    );
    const telemetryContext: TrialAccessTelemetryContext = {
      organization: await OrganizationDomain.loadOrganizationBy({
        id: bundleOrganizationId,
      }),
      actorUserId: user.id,
      emailByUserId,
    };

    await withTransaction(async () => {
      for (const { child, role } of platformRoleAssignments) {
        const groups = await ServiceGroupDomain.loadServiceGroups({
          service_instance_id: child.service_instance_id,
        });

        const targetGroup = role
          ? groups.find((group) => group.name === role)
          : undefined;
        if (role && !targetGroup) {
          throw new Error(ErrorCode.ServiceGroupNotFound);
        }

        const removedMemberships =
          await ServiceGroupDomain.removeUsersFromServiceGroups(
            input.userIds,
            groups
              .map((group) => group.id)
              .filter((groupId) => groupId !== targetGroup?.id)
          );
        const changedUserIds = new Set(
          removedMemberships.map(({ user_id }) => user_id)
        );

        if (targetGroup) {
          const insertedInGroup = await ServiceGroupDomain.addUsersToGroup(
            targetGroup.id,
            input.userIds
          );
          insertedInGroup.forEach((userId) => changedUserIds.add(userId));
        }

        await ServiceGroupHelper.sendTrialAccessTelemetry(telemetryContext, {
          deploymentId: child.id,
          role,
          userIds: [...changedUserIds],
        });
      }
    });

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      platformRoleAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      users.filter(UserHelper.hasAuth0Account).map(({ id }) => id),
      emailByUserId
    );

    return ServiceGroupApp.loadBundleUserServiceGroups(serviceInstanceId);
  },

  updateGroups: async (
    groups: UpdateGroupsPayload
  ): Promise<ServiceGroupResponse[]> => {
    const user = requestContext.requireUser();
    const groupIds = groups.map(({ id }) => id);

    const serviceInstanceIds =
      await ServiceGroupDomain.loadGroupsServiceInstanceIds(groupIds);
    const [firstServiceInstanceId] = serviceInstanceIds;
    if (!firstServiceInstanceId || serviceInstanceIds.length !== 1) {
      throw new Error(ErrorCode.ServiceGroupsLinkedToMultipleServiceInstances);
    }

    const oldUsers = await ServiceGroupDomain.loadServiceInstanceGroupUsers(
      firstServiceInstanceId
    );

    await ServiceGroupSecurityHelper.assertOrganizationAccess(
      firstServiceInstanceId
    );

    const oldUserIds = new Set(oldUsers.map((u) => u.user_id));
    const addedUserIds = [
      ...new Set(groups.flatMap(({ userIds }) => userIds)),
    ].filter((id) => !oldUserIds.has(id));

    await withTransaction(async () => {
      await ServiceGroupDomain.removeUsersFromGroups(groupIds);

      const addUserToGroupPromises = groups.map(async (group) => {
        await ServiceGroupDomain.addUsersToGroup(group.id, group.userIds);
      });

      await Promise.all(addUserToGroupPromises);

      await ServiceGroupHelper.updateAuth0Groups(
        oldUsers,
        groups,
        firstServiceInstanceId
      );
    });

    if (addedUserIds.length > 0) {
      const deploymentRequest =
        await DeploymentRequestDomain.loadDeploymentRequestBy({
          service_instance_id: serviceInstanceIds[0],
        });
      if (deploymentRequest) {
        const addedUsers = await UserDomain.loadUsers(addedUserIds);
        await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
          platformId: deploymentRequest.platform_id,
          platformIdentifier: deploymentRequest.platform_identifier,
          deploymentType: deploymentRequest.type,
          endDate: deploymentRequest.end_date,
          newlyAddedUsers: addedUsers,
          adminEmail: user.email,
        });
      }
    }

    const serviceGroups = await ServiceGroupDomain.loadServiceGroups({
      service_instance_id: serviceInstanceIds[0],
    });
    return serviceGroups.map(ServiceGroupHelper.toServiceGroupResponse);
  },
  removeExpiredGroups: async (): Promise<void> => {
    const rows = await ServiceGroupDomain.loadGroupsForExpiredTrials();

    const byServiceInstance = rows.reduce<
      Map<
        ServiceInstanceId,
        { deploymentRequestId: string; groupIds: ServiceGroupId[] }
      >
    >((acc, row) => {
      const entry = acc.get(row.serviceInstanceId) ?? {
        deploymentRequestId: row.deploymentRequestId,
        groupIds: [],
      };
      entry.groupIds.push(row.groupId);
      acc.set(row.serviceInstanceId, entry);
      return acc;
    }, new Map());

    for (const [
      serviceInstanceId,
      { deploymentRequestId, groupIds },
    ] of byServiceInstance) {
      logApp.info('Removing users from expired trial groups', {
        deploymentRequestId,
        groupCount: groupIds.length,
      });
      try {
        const oldUsers =
          await ServiceGroupDomain.loadServiceInstanceGroupUsers(
            serviceInstanceId
          );
        await ServiceGroupHelper.updateAuth0Groups(
          oldUsers,
          [],
          serviceInstanceId
        );
        await ServiceGroupDomain.deleteGroups(groupIds);
      } catch (error) {
        logApp.error('Failed to clean up expired trial groups', {
          deploymentRequestId,
          error,
        });
      }
    }
  },

  // The Auth0 calls run outside any transaction; the status update and the emails
  // share one, so a failed status write leaves no email behind (only when
  // mail_use_queue_processing is on: the queued job then joins the transaction).
  // A status changed meanwhile throws UserStatusChangedConcurrently.
  grantUserAccessAndSetStatus: async (
    user: User,
    newStatus: UserAccountStatus | null,
    expectedStatus: UserAccountStatus | null,
    prefetchedAuth0Users?: Management.UserResponseSchema[]
  ): Promise<void> => {
    const deploymentRequestsWithGroupName =
      await ServiceGroupDomain.loadUserDeploymentRequestsWithGroupName(user.id);

    // Nothing to grant (e.g. every bundle has expired): not a failure.
    if (deploymentRequestsWithGroupName.length > 0) {
      await ServiceGroupHelper.syncAuth0GroupsForChildren(
        deploymentRequestsWithGroupName.map((deploymentRequest) => ({
          child: deploymentRequest,
          groupNames: [deploymentRequest.group_name],
        })),
        [user.id],
        new Map([[user.id, user.email]]),
        prefetchedAuth0Users && new Map([[user.id, prefetchedAuth0Users]])
      );
    }

    await withTransaction(async () => {
      const updatedUser = await UserDomain.updateUser(
        user.id,
        { status: newStatus },
        { status: expectedStatus }
      );
      if (!updatedUser) {
        throw new Error(ErrorCode.UserStatusChangedConcurrently);
      }
      await ServiceGroupHelper.sendBundleWelcomeEmailsForGrant(
        deploymentRequestsWithGroupName,
        user
      );
    });
  },

  grantAccessIfWaiting: async (user: UserLoadUserBy): Promise<void> => {
    if (user.status !== UserAccountStatus.Waiting) {
      return;
    }

    try {
      await ServiceGroupApp.grantUserAccessAndSetStatus(
        user,
        null,
        UserAccountStatus.Waiting
      );
      user.status = null;
    } catch (error) {
      if (getErrorMessage(error) === ErrorCode.UserStatusChangedConcurrently) {
        logApp.info('User status changed concurrently, login grant skipped', {
          userId: user.id,
        });
        return;
      }
      logApp.error('Unable to grant service group access at login', {
        userId: user.id,
        error,
      });
    }
  },
};
