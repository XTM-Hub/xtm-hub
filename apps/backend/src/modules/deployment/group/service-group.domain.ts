import { db } from '../../../../knexfile';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  ServiceGroupName,
} from '../../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import ServiceGroup, {
  ServiceGroupId,
  ServiceGroupMutator,
} from '../../../model/kanel/public/ServiceGroup';
import ServiceGroupUser, {
  ServiceGroupUserInitializer,
} from '../../../model/kanel/public/ServiceGroupUser';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import {
  BadRequestErrorCode,
  UnknownErrorCode,
} from '../../../utils/error/error.code';

export const GROUPS_BY_PLATFORM_IDENTIFIER: Partial<
  Record<PlatformIdentifier, readonly ServiceGroupName[]>
> = {
  [PlatformIdentifier.Opencti]: [
    ServiceGroupName.Admin,
    ServiceGroupName.Analyst,
    ServiceGroupName.Reader,
  ],
  [PlatformIdentifier.Openaev]: [
    ServiceGroupName.Admin,
    ServiceGroupName.Manager,
    ServiceGroupName.Observer,
  ],
  [PlatformIdentifier.Xtmone]: [ServiceGroupName.Admin, ServiceGroupName.User],
};

export const ServiceGroupDomain = {
  loadGroupsServiceInstanceIds: async (
    groupIds: ServiceGroupId[]
  ): Promise<ServiceInstanceId[]> => {
    const serviceInstances = await db<{ id: ServiceInstanceId }[]>(
      'ServiceInstance'
    )
      .leftJoin(
        'ServiceGroup',
        'ServiceGroup.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .whereIn('ServiceGroup.id', groupIds)
      .distinct('ServiceInstance.id')
      .select('ServiceInstance.id');

    return serviceInstances.map(({ id }) => id);
  },

  loadServiceGroups: async (
    field: ServiceGroupMutator
  ): Promise<ServiceGroup[]> => {
    return db<ServiceGroup[]>('ServiceGroup').select('*').where(field);
  },

  loadServiceGroupsByServiceInstanceIds: async (
    serviceInstanceIds: ServiceInstanceId[]
  ): Promise<ServiceGroup[]> => {
    if (!serviceInstanceIds.length) {
      return [];
    }

    return db<ServiceGroup[]>('ServiceGroup')
      .select('*')
      .whereIn('service_instance_id', serviceInstanceIds);
  },

  loadServiceGroupsByServiceInstanceAndUser: async (
    serviceInstanceId: ServiceInstanceId,
    userId: UserId
  ): Promise<ServiceGroup[]> => {
    return db<ServiceGroup[]>('ServiceGroup')
      .leftJoin(
        'ServiceGroup_User',
        'ServiceGroup.id',
        '=',
        'ServiceGroup_User.group_id'
      )
      .where('ServiceGroup.service_instance_id', '=', serviceInstanceId)
      .where('ServiceGroup_User.user_id', '=', userId)
      .select('ServiceGroup.*');
  },

  loadGroupUsers: async (groupId: ServiceGroupId): Promise<User[]> => {
    return db<User[]>('ServiceGroup')
      .leftJoin(
        'ServiceGroup_User',
        'ServiceGroup.id',
        '=',
        'ServiceGroup_User.group_id'
      )
      .innerJoin('User', 'ServiceGroup_User.user_id', '=', 'User.id')
      .where('ServiceGroup.id', '=', groupId)
      .select('User.*');
  },

  loadGroupUsersByServiceAndName: async (
    serviceInstanceId: ServiceInstanceId,
    name: ServiceGroupName
  ): Promise<User[]> => {
    return db<User[]>('ServiceGroup')
      .leftJoin(
        'ServiceGroup_User',
        'ServiceGroup.id',
        '=',
        'ServiceGroup_User.group_id'
      )
      .innerJoin('User', 'ServiceGroup_User.user_id', '=', 'User.id')
      .where('ServiceGroup.service_instance_id', '=', serviceInstanceId)
      .where('ServiceGroup.name', '=', name)
      .select('User.*');
  },

  addUsersToGroup: async (
    groupId: ServiceGroupId,
    userIds: UserId[]
  ): Promise<UserId[]> => {
    if (!userIds.length) {
      return [];
    }

    const data: ServiceGroupUserInitializer[] = userIds.map((userId) => ({
      user_id: userId,
      group_id: groupId,
    }));

    const rows = await db<ServiceGroupUser>('ServiceGroup_User')
      .insert(data)
      .onConflict(['group_id', 'user_id'])
      .ignore()
      .returning('user_id');

    return rows.map(({ user_id }) => user_id);
  },

  removeUsersFromGroups: async (groupIds: ServiceGroupId[]) => {
    if (!groupIds.length) {
      return;
    }

    await db('ServiceGroup_User').del().whereIn('group_id', groupIds);
  },

  removeUsersFromServiceGroups: async (
    userIds: UserId[],
    groupIds: ServiceGroupId[]
  ) => {
    if (!userIds.length || !groupIds.length) {
      return;
    }

    await db('ServiceGroup_User')
      .del()
      .whereIn('user_id', userIds)
      .whereIn('group_id', groupIds);
  },

  deleteGroups: async (groupIds: ServiceGroupId[]) => {
    if (!groupIds.length) {
      return;
    }

    await db('ServiceGroup').del().whereIn('id', groupIds);
  },

  loadGroupsForExpiredTrials: async (): Promise<
    {
      deploymentRequestId: DeploymentRequestId;
      groupId: ServiceGroupId;
      serviceInstanceId: ServiceInstanceId;
    }[]
  > => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return db<{
      groupId: ServiceGroupId;
      deploymentRequestId: DeploymentRequestId;
      serviceInstanceId: ServiceInstanceId;
    }>('ServiceGroup')
      .join(
        'DeploymentRequest',
        'DeploymentRequest.service_instance_id',
        '=',
        'ServiceGroup.service_instance_id'
      )
      .where(
        'DeploymentRequest.type',
        '=',
        DeploymentRequestDeploymentType.Trial
      )
      .whereIn('DeploymentRequest.hub_status', [
        DeploymentRequestHubStatus.Expired,
        DeploymentRequestHubStatus.Cancelled,
      ])
      .where('DeploymentRequest.end_date', '<', sevenDaysAgo)
      .select(
        'ServiceGroup.id as groupId',
        'DeploymentRequest.id as deploymentRequestId',
        'ServiceGroup.service_instance_id as serviceInstanceId'
      );
  },

  loadServiceInstanceGroupUsers: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<ServiceGroupUser[]> => {
    return db<ServiceGroupUser>('ServiceGroup_User')
      .leftJoin(
        'ServiceGroup',
        'ServiceGroup.id',
        '=',
        'ServiceGroup_User.group_id'
      )
      .where('ServiceGroup.service_instance_id', '=', serviceInstanceId)
      .select('ServiceGroup_User.*');
  },

  initGroupWithAdmin: async (
    userAdminId: UserId,
    serviceInstancesId: ServiceInstanceId,
    platformIdentifier: PlatformIdentifier = PlatformIdentifier.Opencti
  ) => {
    const groups = GROUPS_BY_PLATFORM_IDENTIFIER[platformIdentifier];
    if (!groups) {
      throw new Error(BadRequestErrorCode.InvalidPlatformIdentifier);
    }
    const rolesToInsert = groups.map((groupName) => ({
      name: groupName,
      service_instance_id: serviceInstancesId,
    }));
    const insertResponse = await db<ServiceGroup>('ServiceGroup')
      .insert(rolesToInsert)
      .returning(['id', 'name']);
    const findAdminGroupId = insertResponse.find(
      (group) => group.name === ServiceGroupName.Admin
    );
    if (!findAdminGroupId) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    await ServiceGroupDomain.addUsersToGroup(findAdminGroupId.id, [
      userAdminId,
    ]);
  },
};
