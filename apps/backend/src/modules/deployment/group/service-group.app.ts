import {
  AddUsersToBundleGroupsInput,
  BundleUserServiceGroup,
  PlatformIdentifier,
  ServiceGroupName,
  ServiceGroup as ServiceGroupResponse,
  UpdateBundleUserGroupsInput,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { CRONS_USER_UUID } from '../../../portal.const';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { OrganizationDomain } from '../../organization-management/organization/organization.domain';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { DeploymentRequestDomain } from '../deployment.domain';
import { ServiceGroupDomain } from './service-group.domain';
import { ServiceGroupHelper } from './service-group.helper';
import { ServiceGroupSecurityHelper } from './service-group.security.helper';

export type UpdateGroupsPayload = { id: ServiceGroupId; userIds: UserId[] }[];

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

    const targetGroupIdByChildId = new Map<
      DeploymentRequestId,
      ServiceGroupId
    >();
    for (const { child, role } of platformRoleAssignments) {
      const groups = await ServiceGroupDomain.loadServiceGroups({
        service_instance_id: child.service_instance_id,
      });
      const targetGroup = groups.find((group) => group.name === role);
      if (!targetGroup) {
        throw new Error(ErrorCode.ServiceGroupNotFound);
      }
      targetGroupIdByChildId.set(child.id, targetGroup.id);
    }

    const { users, emailByUserId } = await ServiceGroupHelper.loadEmailByUserId(
      input.userIds
    );

    const grantedAssignments = platformRoleAssignments.filter(
      ({ child, role }) => child.platform_identifier && role
    );

    const grantedUserIds = await ServiceGroupHelper.syncAuth0GroupsForChildren(
      grantedAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      input.userIds,
      emailByUserId
    );

    const newlyGrantedUserIdsByChildId = new Map<
      DeploymentRequestId,
      UserId[]
    >();
    const insertedUserIds = await withTransaction(async () => {
      const inserted = new Set<UserId>();

      for (const { child } of platformRoleAssignments) {
        const targetGroupId = targetGroupIdByChildId.get(child.id);
        if (!targetGroupId) {
          continue;
        }
        const newlyInsertedUserIds = await ServiceGroupDomain.addUsersToGroup(
          targetGroupId,
          input.userIds
        );
        newlyGrantedUserIdsByChildId.set(child.id, newlyInsertedUserIds);
        newlyInsertedUserIds.forEach((userId) => inserted.add(userId));
      }

      return inserted;
    });

    try {
      const grantedUserIdSet = new Set(grantedUserIds);
      await sendBundleTrialAccessTelemetry({
        bundleOrganizationId,
        bundleDeploymentRequestId: bundleDeploymentRequest.id,
        actorUserId: user.id,
        emailByUserId,
        assignments: grantedAssignments.map(({ child, role }) => ({
          deploymentId: child.id,
          role,
          userIds: (newlyGrantedUserIdsByChildId.get(child.id) ?? []).filter(
            (userId) => grantedUserIdSet.has(userId)
          ),
        })),
      });
    } catch (telemetryError) {
      logApp.error('Failed to send trial-access-granted telemetry', {
        serviceInstanceId,
        error: telemetryError,
      });
    }

    await ServiceGroupHelper.sendFreeTrialBundleWelcomeEmails({
      endDate: bundleDeploymentRequest.end_date,
      products: grantedAssignments.flatMap(({ child }) =>
        child.platform_identifier ? [child.platform_identifier] : []
      ),
      newlyAddedUsers: users.filter((addedUser) =>
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

    const { bundleDeploymentRequest, children, bundleOrganizationId } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    const serviceInstanceIds = children.map(
      (child) => child.service_instance_id
    );

    const groups =
      await ServiceGroupDomain.loadServiceGroupsByServiceInstanceIds(
        serviceInstanceIds
      );
    const allGroupIds = groups.map((group) => group.id);
    const serviceInstanceIdByGroupId = new Map(
      groups.map((group) => [group.id, group.service_instance_id])
    );

    const { emailByUserId } =
      await ServiceGroupHelper.loadEmailByUserId(userIds);

    const removedUserIds = await ServiceGroupHelper.syncAuth0GroupsForChildren(
      children.map((child) => ({ child, groupNames: [] })),
      userIds,
      emailByUserId
    );
    const removedUserIdSet = new Set(removedUserIds);

    const removedMemberships =
      await ServiceGroupDomain.removeUsersFromServiceGroups(
        userIds,
        allGroupIds
      );

    const memberUserIdsByServiceInstance = new Map<
      ServiceInstanceId,
      Set<UserId>
    >();
    for (const { user_id, group_id } of removedMemberships) {
      const childServiceInstanceId = serviceInstanceIdByGroupId.get(group_id);
      if (!childServiceInstanceId) {
        continue;
      }
      const memberUserIds =
        memberUserIdsByServiceInstance.get(childServiceInstanceId) ??
        new Set<UserId>();
      memberUserIds.add(user_id);
      memberUserIdsByServiceInstance.set(childServiceInstanceId, memberUserIds);
    }

    try {
      await sendBundleTrialAccessTelemetry({
        bundleOrganizationId,
        bundleDeploymentRequestId: bundleDeploymentRequest.id,
        actorUserId: user.id,
        emailByUserId,
        assignments: children.map((child) => ({
          deploymentId: child.id,
          role: null,
          userIds: [
            ...(memberUserIdsByServiceInstance.get(child.service_instance_id) ??
              []),
          ].filter((userId) => removedUserIdSet.has(userId)),
        })),
      });
    } catch (telemetryError) {
      logApp.error('Failed to send trial-access-removed telemetry', {
        serviceInstanceId,
        error: telemetryError,
      });
    }

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
      input.roles
    );

    const groupPlanByChildId = new Map<
      DeploymentRequestId,
      {
        targetGroupId: ServiceGroupId | undefined;
        groupIdsToClear: ServiceGroupId[];
      }
    >();
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

      const groupIdsToClear = groups
        .map((group) => group.id)
        .filter((groupId) => groupId !== targetGroup?.id);

      groupPlanByChildId.set(child.id, {
        targetGroupId: targetGroup?.id,
        groupIdsToClear,
      });
    }

    const { emailByUserId } = await ServiceGroupHelper.loadEmailByUserId(
      input.userIds
    );

    const updatedUserIds = await ServiceGroupHelper.syncAuth0GroupsForChildren(
      platformRoleAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      input.userIds,
      emailByUserId
    );

    const changedUserIdsByChildId = new Map<DeploymentRequestId, UserId[]>();
    await withTransaction(async () => {
      for (const { child } of platformRoleAssignments) {
        const plan = groupPlanByChildId.get(child.id);
        if (!plan) {
          continue;
        }
        const { targetGroupId, groupIdsToClear } = plan;

        const removedMemberships =
          await ServiceGroupDomain.removeUsersFromServiceGroups(
            input.userIds,
            groupIdsToClear
          );
        const changedUserIds = new Set(
          removedMemberships.map((membership) => membership.user_id)
        );

        if (targetGroupId) {
          const newlyInsertedUserIds = await ServiceGroupDomain.addUsersToGroup(
            targetGroupId,
            input.userIds
          );
          newlyInsertedUserIds.forEach((userId) => changedUserIds.add(userId));
        }

        changedUserIdsByChildId.set(child.id, [...changedUserIds]);
      }
    });

    try {
      const updatedUserIdSet = new Set(updatedUserIds);
      await sendBundleTrialAccessTelemetry({
        bundleOrganizationId,
        bundleDeploymentRequestId: bundleDeploymentRequest.id,
        actorUserId: user.id,
        emailByUserId,
        assignments: platformRoleAssignments.map(({ child, role }) => ({
          deploymentId: child.id,
          role,
          userIds: (changedUserIdsByChildId.get(child.id) ?? []).filter(
            (userId) => updatedUserIdSet.has(userId)
          ),
        })),
      });
    } catch (telemetryError) {
      logApp.error('Failed to send trial-access telemetry', {
        serviceInstanceId,
        error: telemetryError,
      });
    }

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
        {
          deploymentRequestId: DeploymentRequestId;
          groupIds: ServiceGroupId[];
          parentId: DeploymentRequestId | null;
        }
      >
    >((acc, row) => {
      const entry = acc.get(row.serviceInstanceId) ?? {
        deploymentRequestId: row.deploymentRequestId,
        groupIds: [],
        parentId: row.parentId,
      };
      entry.groupIds.push(row.groupId);
      acc.set(row.serviceInstanceId, entry);
      return acc;
    }, new Map());

    for (const [
      serviceInstanceId,
      { deploymentRequestId, groupIds, parentId },
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

        if (parentId && oldUsers.length > 0) {
          try {
            await sendExpiredBundleTrialTelemetry({
              serviceInstanceId,
              deploymentRequestId,
              parentId,
              removedUserIds: [
                ...new Set(oldUsers.map((oldUser) => oldUser.user_id)),
              ],
            });
          } catch (telemetryError) {
            logApp.error('Failed to send expired-trial telemetry', {
              deploymentRequestId,
              error: telemetryError,
            });
          }
        }
      } catch (error) {
        logApp.error('Failed to clean up expired trial groups', {
          deploymentRequestId,
          error,
        });
      }
    }
  },
};

const sendBundleTrialAccessTelemetry = async ({
  bundleOrganizationId,
  bundleDeploymentRequestId,
  actorUserId,
  emailByUserId,
  assignments,
}: {
  bundleOrganizationId: OrganizationId;
  bundleDeploymentRequestId: DeploymentRequestId;
  actorUserId: UserId;
  emailByUserId: Map<UserId, string>;
  assignments: {
    deploymentId: DeploymentRequestId;
    role: ServiceGroupName | null;
    userIds: UserId[];
  }[];
}): Promise<void> => {
  const bundleOrganization = await OrganizationDomain.loadOrganizationBy({
    id: bundleOrganizationId,
  });
  if (!bundleOrganization) {
    return;
  }

  await ServiceGroupHelper.sendTrialAccessTelemetryForChildren(
    assignments,
    emailByUserId,
    bundleOrganization,
    actorUserId,
    bundleDeploymentRequestId
  );
};

const sendExpiredBundleTrialTelemetry = async ({
  serviceInstanceId,
  deploymentRequestId,
  parentId,
  removedUserIds,
}: {
  serviceInstanceId: ServiceInstanceId;
  deploymentRequestId: DeploymentRequestId;
  parentId: DeploymentRequestId;
  removedUserIds: UserId[];
}): Promise<void> => {
  const organization =
    await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
      serviceInstanceId
    );
  if (!organization) {
    return;
  }

  const { emailByUserId } =
    await ServiceGroupHelper.loadEmailByUserId(removedUserIds);

  await ServiceGroupHelper.sendTrialAccessTelemetryForChildren(
    [
      {
        deploymentId: deploymentRequestId,
        role: null,
        userIds: removedUserIds,
      },
    ],
    emailByUserId,
    organization,
    CRONS_USER_UUID,
    parentId
  );
};
