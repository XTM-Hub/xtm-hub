import {
  AddUsersToBundleGroupsInput,
  BundleUserServiceGroup,
  PlatformIdentifier,
  ServiceGroup as ServiceGroupResponse,
  UpdateBundleUserGroupsInput,
} from '../../../__generated__/resolvers-types';
import { withTransaction } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
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

    const insertedUserIds = await withTransaction(async () => {
      const inserted = new Set<UserId>();

      for (const { child, role } of platformRoleAssignments) {
        const groups = await ServiceGroupDomain.loadServiceGroups({
          service_instance_id: child.service_instance_id,
        });
        const targetGroup = groups.find((group) => group.name === role);
        if (!targetGroup) {
          throw new Error(ErrorCode.ServiceGroupNotFound);
        }

        const insertedInGroup = await ServiceGroupDomain.addUsersToGroup(
          targetGroup.id,
          input.userIds
        );
        insertedInGroup.forEach((userId) => inserted.add(userId));
      }

      return inserted;
    });

    const { users, emailByUserId } = await ServiceGroupHelper.loadEmailByUserId(
      input.userIds
    );

    const grantedAssignments = platformRoleAssignments.filter(
      ({ child, role }) => child.platform_identifier && role
    );

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      grantedAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      input.userIds,
      emailByUserId
    );

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
    const { children } =
      await ServiceGroupSecurityHelper.assertBundleAccessAndLoadChildren(
        serviceInstanceId
      );

    const groups =
      await ServiceGroupDomain.loadServiceGroupsByServiceInstanceIds(
        children.map((child) => child.service_instance_id)
      );
    const allGroupIds = groups.map((group) => group.id);

    await ServiceGroupDomain.removeUsersFromServiceGroups(userIds, allGroupIds);

    const { emailByUserId } =
      await ServiceGroupHelper.loadEmailByUserId(userIds);

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      children.map((child) => ({ child, groupNames: [] })),
      userIds,
      emailByUserId
    );

    return userIds;
  },

  updateBundleUserGroups: async (
    serviceInstanceId: ServiceInstanceId,
    input: UpdateBundleUserGroupsInput
  ): Promise<BundleUserServiceGroup[]> => {
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

    await withTransaction(async () => {
      for (const { child, role } of platformRoleAssignments) {
        const groups = await ServiceGroupDomain.loadServiceGroups({
          service_instance_id: child.service_instance_id,
        });

        await ServiceGroupDomain.removeUsersFromServiceGroups(
          input.userIds,
          groups.map((group) => group.id)
        );

        if (!role) {
          continue;
        }

        const targetGroup = groups.find((group) => group.name === role);
        if (!targetGroup) {
          throw new Error(ErrorCode.ServiceGroupNotFound);
        }

        await ServiceGroupDomain.addUsersToGroup(targetGroup.id, input.userIds);
      }
    });

    const { emailByUserId } = await ServiceGroupHelper.loadEmailByUserId(
      input.userIds
    );

    await ServiceGroupHelper.syncAuth0GroupsForChildren(
      platformRoleAssignments.map(({ child, role }) => ({
        child,
        groupNames: role ? [role] : [],
      })),
      input.userIds,
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
};
