import {
  DeploymentRequestDeploymentType,
  Organization,
  PlatformIdentifier,
  ServiceGroupName,
  ServiceGroup as ServiceGroupResponse,
} from '../../../__generated__/resolvers-types';
import DeploymentRequest, {
  DeploymentRequestId,
} from '../../../model/kanel/public/DeploymentRequest';
import ServiceGroupModel, {
  ServiceGroupId,
} from '../../../model/kanel/public/ServiceGroup';
import ServiceGroupUser from '../../../model/kanel/public/ServiceGroupUser';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { sendMail } from '../../../server/mail-service';
import {
  Auth0UpdateUserRBACInstance,
  auth0Client,
} from '../../../thirdparty/auth0/client';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { formatName } from '../../../utils/format';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { PlatformConfigurationDomain } from '../../registration/platform-configuration/platform-configuration.domain';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryHelper } from '../../telemetry/telemetry.helper';
import { DeploymentRequestDomain } from '../deployment.domain';
import { UpdateGroupsPayload } from './service-group.app';
import { ServiceGroupDomain } from './service-group.domain';

export type UserGroups = { user_id: UserId; group_ids: ServiceGroupId[] };

export const ServiceGroupHelper = {
  buildUserGroupsDiff: (
    oldUsers: ServiceGroupUser[],
    newUsers: UpdateGroupsPayload
  ): UserGroups[] => {
    const oldUserGroups = buildGroupsByUserIdFromOldUsers(oldUsers);
    const newUserGroups = buildGroupsByUserIdFromNewUsers(newUsers);

    const allUserIds = new Set<UserId>([
      ...oldUserGroups.keys(),
      ...newUserGroups.keys(),
    ]);

    const modifiedUsers: UserGroups[] = [];

    for (const user_id of allUserIds) {
      const oldGroups = oldUserGroups.get(user_id);
      const newGroups = newUserGroups.get(user_id);

      if (!areGroupSetsEqual(oldGroups, newGroups)) {
        modifiedUsers.push({
          user_id,
          group_ids: newGroups ? Array.from(newGroups) : [],
        });
      }
    }

    return modifiedUsers;
  },

  toServiceGroupResponse: (
    serviceGroup: ServiceGroupModel
  ): ServiceGroupResponse => ({
    ...serviceGroup,
    name: serviceGroup.name as ServiceGroupName,
  }),

  matchRolesToChildren: <T extends ServiceGroupName | null>(
    children: DeploymentRequest[],
    roles: { product: PlatformIdentifier; role?: T | null }[]
  ): { child: DeploymentRequest; role: T | null }[] =>
    roles.flatMap((roleAssignment) => {
      const child = children.find(
        (deploymentRequest) =>
          deploymentRequest.platform_identifier === roleAssignment.product
      );
      return child ? [{ child, role: roleAssignment.role ?? null }] : [];
    }),

  loadEmailByUserId: async (
    userIds: UserId[]
  ): Promise<{ users: User[]; emailByUserId: Map<UserId, string> }> => {
    const users = await UserDomain.loadUsers(userIds);
    return {
      users,
      emailByUserId: new Map(users.map(({ id, email }) => [id, email])),
    };
  },

  syncAuth0GroupsForChildren: async (
    childGroupAssignments: {
      child: DeploymentRequest;
      groupNames: ServiceGroupName[];
    }[],
    userIds: UserId[],
    emailByUserId: Map<UserId, string>
  ): Promise<UserId[]> => {
    const rbacInstance: Auth0UpdateUserRBACInstance = {};
    childGroupAssignments.forEach(({ child, groupNames }) => {
      if (!child.platform_id) {
        return;
      }
      rbacInstance[child.platform_id] = { groups: groupNames };
    });

    if (Object.keys(rbacInstance).length === 0) {
      return [];
    }

    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const email = emailByUserId.get(userId);
        if (!email) {
          return null;
        }
        await auth0Client.updateUserRBACInstance(email, rbacInstance);
        return userId;
      })
    );

    const succeededUserIds: UserId[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logApp.error('Failed to update Auth0 RBAC groups for user', {
          userId: userIds[index],
          error: result.reason,
        });
        return;
      }
      if (result.value) {
        succeededUserIds.push(result.value);
      }
    });

    return succeededUserIds;
  },

  sendTrialAccessTelemetryForChildren: async (
    childRoleAssignments: {
      deploymentId: DeploymentRequestId;
      role: ServiceGroupName | null;
      userIds: UserId[];
    }[],
    emailByUserId: Map<UserId, string>,
    organization: Organization,
    actorUserId: UserId,
    bundleDeploymentRequestId: DeploymentRequestId
  ): Promise<void> => {
    const events = childRoleAssignments
      .flatMap(({ deploymentId, role, userIds }) =>
        userIds.map((userId) => ({
          deploymentId,
          role,
          email: emailByUserId.get(userId),
        }))
      )
      .filter(
        (
          assignment
        ): assignment is {
          deploymentId: DeploymentRequestId;
          role: ServiceGroupName | null;
          email: string;
        } => Boolean(assignment.email)
      );

    const BATCH_SIZE = 20;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async ({ deploymentId, role, email }) => {
          const event = role
            ? TelemetryHelper.buildTrialAccessGrantedEvent(
                organization,
                actorUserId,
                {
                  deployment_id: deploymentId,
                  parent_id: bundleDeploymentRequestId,
                  role,
                  email,
                }
              )
            : TelemetryHelper.buildTrialAccessRemovedEvent(
                organization,
                actorUserId,
                {
                  deployment_id: deploymentId,
                  parent_id: bundleDeploymentRequestId,
                  email,
                }
              );
          await TelemetryApp.sendTelemetryEvent(event);
        })
      );
    }
  },

  sendFreeTrialWelcomeEmails: async ({
    platformId,
    platformIdentifier,
    deploymentType,
    endDate,
    newlyAddedUsers,
    adminEmail,
  }: {
    platformId: string | null;
    platformIdentifier: PlatformIdentifier | null;
    deploymentType: DeploymentRequestDeploymentType;
    endDate: Date | null;
    newlyAddedUsers: User[];
    adminEmail: string;
  }): Promise<void> => {
    if (
      !platformId ||
      !platformIdentifier ||
      deploymentType !== DeploymentRequestDeploymentType.Trial ||
      newlyAddedUsers.length === 0
    ) {
      return;
    }

    try {
      const platformConfiguration =
        await PlatformConfigurationDomain.loadConfigurationByPlatform(
          platformId
        );
      if (!platformConfiguration || !endDate) {
        return;
      }

      const trialEndDate = endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });
      await Promise.all(
        newlyAddedUsers.map((addedUser) =>
          sendMail({
            to: addedUser.email,
            template: 'free_trial_user_added',
            params: {
              firstName: formatName(addedUser.first_name),
              platformUrl: platformConfiguration.platform_url,
              platformIdentifier,
              adminEmail,
              trialEndDate,
            },
          })
        )
      );
    } catch (error) {
      logApp.error('Unable to send free_trial_user_added mail', { error });
    }
  },

  updateAuth0Groups: async (
    oldUsers: ServiceGroupUser[],
    newUsers: UpdateGroupsPayload,
    serviceInstanceId: ServiceInstanceId
  ): Promise<void> => {
    const updatedUsers = ServiceGroupHelper.buildUserGroupsDiff(
      oldUsers,
      newUsers
    );

    const users = await UserDomain.loadUsers(
      updatedUsers.map(({ user_id }) => user_id)
    );
    const userEmailMap: Map<UserId, string> = users.reduce(
      (acc, current) => {
        acc.set(current.id, current.email);
        return acc;
      },

      new Map<UserId, string>()
    );

    const serviceGroups = await ServiceGroupDomain.loadServiceGroups({
      service_instance_id: serviceInstanceId,
    });

    const groupNameIndexedByGroupId = serviceGroups.reduce((acc, current) => {
      acc.set(current.id, current.name);
      return acc;
    }, new Map<ServiceGroupId, string>());

    const deploymentRequest =
      await DeploymentRequestDomain.loadDeploymentRequestBy({
        service_instance_id: serviceInstanceId,
      });

    if (!deploymentRequest) {
      throw new Error(ErrorCode.DeploymentRequestNotFound);
    }
    const { platform_id } = deploymentRequest;
    if (!platform_id) {
      throw new Error(ErrorCode.InvalidPlatformId);
    }

    await Promise.all(
      updatedUsers.map(async (updatedUser) => {
        const email = userEmailMap.get(updatedUser.user_id);
        if (!email) {
          return;
        }

        await auth0Client.updateUserRBACInstance(email, {
          [platform_id]: {
            groups: updatedUser.group_ids.flatMap(
              (group_id) => groupNameIndexedByGroupId.get(group_id) ?? []
            ),
          },
        });
      })
    );
  },
};

const buildGroupsByUserIdFromOldUsers = (
  oldUsers: ServiceGroupUser[]
): Map<UserId, Set<ServiceGroupId>> => {
  const userGroups = new Map<UserId, Set<ServiceGroupId>>();

  for (const { user_id, group_id } of oldUsers) {
    let set = userGroups.get(user_id);
    if (!set) {
      set = new Set();
      userGroups.set(user_id, set);
    }
    set.add(group_id);
  }

  return userGroups;
};

const buildGroupsByUserIdFromNewUsers = (
  newUsers: UpdateGroupsPayload
): Map<UserId, Set<ServiceGroupId>> => {
  const groupsIndexedByUserId = new Map<UserId, Set<ServiceGroupId>>();

  for (const { id, userIds } of newUsers) {
    for (const user_id of userIds) {
      let set = groupsIndexedByUserId.get(user_id);
      if (!set) {
        set = new Set();
        groupsIndexedByUserId.set(user_id, set);
      }
      set.add(id);
    }
  }

  return groupsIndexedByUserId;
};

const areGroupSetsEqual = (
  a: Set<string> | undefined,
  b: Set<string> | undefined
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.size !== b.size) return false;

  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
};
