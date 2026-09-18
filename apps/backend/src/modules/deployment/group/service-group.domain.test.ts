import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../../../knexfile';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  DeploymentRequestHubStatus,
  ServiceInstanceCreationStatus,
} from '../../../__generated__/resolvers-types';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { ServiceInstanceDomain } from '../../service/instance/service-instance.domain';
import { ServiceGroupDomain } from './service-group.domain';

describe('serviceGroupDomain', () => {
  const adminGroupId = uuidv4() as ServiceGroupId;
  const analystGroupId = uuidv4() as ServiceGroupId;
  const readerGroupId = uuidv4() as ServiceGroupId;

  const serviceInstanceId1 = uuidv4() as ServiceInstanceId;
  const serviceInstanceId2 = uuidv4() as ServiceInstanceId;

  beforeAll(async () => {
    await TestHelper.serviceInstance.create({
      id: serviceInstanceId1,
      name: 'Service instance 1',
      description: '',
      creation_status: ServiceInstanceCreationStatus.Ready,
      public: false,
      tags: [],
      service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    });
    await TestHelper.serviceInstance.create({
      id: serviceInstanceId2,
      name: 'Service instance 2',
      description: '',
      creation_status: ServiceInstanceCreationStatus.Ready,
      public: false,
      tags: [],
      service_definition_id: SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
    });

    await TestHelper.serviceGroup.create({
      id: adminGroupId,
      name: 'Admin',
      service_instance_id: serviceInstanceId1,
    });
    await TestHelper.serviceGroup.create({
      id: analystGroupId,
      name: 'Analyst',
      service_instance_id: serviceInstanceId1,
    });
    await TestHelper.serviceGroup.create({
      id: readerGroupId,
      name: 'Reader',
      service_instance_id: serviceInstanceId2,
    });
  });

  afterEach(async () => {
    await TestHelper.serviceGroupUser.delete({});
  });

  describe('loadGroupsServiceInstanceIds', () => {
    it('should return distinct service instance ids associated with groups', async () => {
      const groupIds = [adminGroupId, analystGroupId, readerGroupId];
      const ids =
        await ServiceGroupDomain.loadGroupsServiceInstanceIds(groupIds);

      expect(ids).toHaveLength(2);
      expect(ids.find((id) => id === serviceInstanceId1)).toBeTruthy();
      expect(ids.find((id) => id === serviceInstanceId2)).toBeTruthy();
    });
  });

  describe('loadGroupUsers', () => {
    it('should return users associated to service group', async () => {
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        group_id: adminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        group_id: adminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        group_id: analystGroupId,
      });

      const adminUsers = await ServiceGroupDomain.loadGroupUsers(adminGroupId);
      expect(adminUsers).toHaveLength(2);
      expect(
        adminUsers.find(
          ({ id }) => id === TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
        )
      ).toBeTruthy();
      expect(
        adminUsers.find(
          ({ id }) =>
            id === TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
        )
      ).toBeTruthy();

      const analystUsers =
        await ServiceGroupDomain.loadGroupUsers(analystGroupId);
      expect(analystUsers).toHaveLength(1);
      expect(
        analystUsers[0]?.id ===
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID
      ).toBe(true);
    });
  });

  describe('addUsersToGroup', () => {
    it('should add users to the service group', async () => {
      await ServiceGroupDomain.addUsersToGroup(adminGroupId, [
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
      ]);

      const serviceGroupUsers = await TestHelper.serviceGroupUser.load({
        group_id: adminGroupId,
      });

      expect(serviceGroupUsers).toHaveLength(2);

      expect(serviceGroupUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          }),
          expect.objectContaining({
            user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          }),
        ])
      );
    });

    it('should ignore users already in the group and only return the newly inserted ones', async () => {
      await ServiceGroupDomain.addUsersToGroup(adminGroupId, [
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      ]);

      const insertedUserIds = await ServiceGroupDomain.addUsersToGroup(
        adminGroupId,
        [
          TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        ]
      );

      const serviceGroupUsers = await TestHelper.serviceGroupUser.load({
        group_id: adminGroupId,
      });

      expect(insertedUserIds).toEqual([
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
      ]);
      expect(serviceGroupUsers).toHaveLength(2);
    });
  });

  describe('loadGroupsForExpiredTrials', () => {
    const trackedServiceInstanceIds: ServiceInstanceId[] = [];

    afterEach(async () => {
      // eslint-disable-next-line no-restricted-syntax
      await db('DeploymentRequest')
        .whereIn('service_instance_id', trackedServiceInstanceIds)
        .delete();
      // eslint-disable-next-line no-restricted-syntax
      await db('Subscription')
        .whereIn('service_instance_id', trackedServiceInstanceIds)
        .delete();
      for (const id of trackedServiceInstanceIds) {
        await ServiceInstanceDomain.deleteServiceInstanceBy({ id });
      }
      trackedServiceInstanceIds.length = 0;
    });

    it.each([
      DeploymentRequestHubStatus.Expired,
      DeploymentRequestHubStatus.Cancelled,
    ])(
      'should return groups for a %s trial expired more than 7 days ago',
      async (hub_status) => {
        // Given
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 8);
        const deploymentRequest =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status,
              end_date: endDate,
            }
          );
        trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

        const groupId = uuidv4() as ServiceGroupId;
        await TestHelper.serviceGroup.create({
          id: groupId,
          name: 'Admin',
          service_instance_id: deploymentRequest.service_instance_id,
        });

        // When
        const result = await ServiceGroupDomain.loadGroupsForExpiredTrials();

        // Then
        expect(result).toMatchObject([
          {
            deploymentRequestId: deploymentRequest.id,
            serviceInstanceId: deploymentRequest.service_instance_id,
            groupId,
          },
        ]);
      }
    );

    it('should not return groups for a trial expired less than 7 days ago', async () => {
      // Given
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 6);
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            end_date: endDate,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

      await TestHelper.serviceGroup.create({
        name: 'Admin',
        service_instance_id: deploymentRequest.service_instance_id,
      });

      // When
      const result = await ServiceGroupDomain.loadGroupsForExpiredTrials();

      // Then
      expect(result).toEqual([]);
    });

    it.each([
      DeploymentRequestHubStatus.Active,
      DeploymentRequestHubStatus.Pending,
    ])(
      'should not return groups for a trial with hub_status %s',
      async (hub_status) => {
        // Given
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 8);
        const deploymentRequest =
          await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
            {
              hub_status,
              end_date: endDate,
            }
          );
        trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

        await TestHelper.serviceGroup.create({
          name: 'Admin',
          service_instance_id: deploymentRequest.service_instance_id,
        });

        // When
        const result = await ServiceGroupDomain.loadGroupsForExpiredTrials();

        // Then
        expect(result).toEqual([]);
      }
    );

    it('should return groups from all expired trials when multiple exist', async () => {
      // Given
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 8);

      const deploymentRequest1 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            end_date: endDate,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest1.service_instance_id);

      const groupId1 = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId1,
        name: 'Admin',
        service_instance_id: deploymentRequest1.service_instance_id,
      });

      const deploymentRequest2 =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Cancelled,
            end_date: endDate,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest2.service_instance_id);

      const groupId2 = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId2,
        name: 'Admin',
        service_instance_id: deploymentRequest2.service_instance_id,
      });

      // When
      const result = await ServiceGroupDomain.loadGroupsForExpiredTrials();

      // Then
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.deploymentRequestId)).toEqual(
        expect.arrayContaining([deploymentRequest1.id, deploymentRequest2.id])
      );
    });

    it('should return empty array when no expired trials exist', async () => {
      // When
      const result = await ServiceGroupDomain.loadGroupsForExpiredTrials();

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('loadServiceGroupsByServiceInstanceAndUser', () => {
    it.each([
      {
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        serviceInstanceId: serviceInstanceId1,
        expectedGroups: [
          {
            id: adminGroupId,
            name: 'Admin',
            service_instance_id: serviceInstanceId1,
          },
          {
            id: analystGroupId,
            name: 'Analyst',
            service_instance_id: serviceInstanceId1,
          },
        ],
      },
      {
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        serviceInstanceId: serviceInstanceId2,
        expectedGroups: [
          {
            id: readerGroupId,
            name: 'Reader',
            service_instance_id: serviceInstanceId2,
          },
        ],
      },
      {
        userId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        serviceInstanceId: serviceInstanceId1,
        expectedGroups: [
          {
            id: analystGroupId,
            name: 'Analyst',
            service_instance_id: serviceInstanceId1,
          },
        ],
      },
    ])(
      'should return only groups linked to the user and service instance',
      async ({ userId, serviceInstanceId, expectedGroups }) => {
        // Given
        await TestHelper.serviceGroupUser.create({
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          group_id: adminGroupId,
        });
        await TestHelper.serviceGroupUser.create({
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          group_id: analystGroupId,
        });
        await TestHelper.serviceGroupUser.create({
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          group_id: readerGroupId,
        });
        await TestHelper.serviceGroupUser.create({
          user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
          group_id: analystGroupId,
        });

        // When
        const groups =
          await ServiceGroupDomain.loadServiceGroupsByServiceInstanceAndUser(
            serviceInstanceId,
            userId
          );

        // Then
        const sortedGroups = groups
          .map(({ id, name, service_instance_id }) => ({
            id,
            name,
            service_instance_id,
          }))
          .sort((left, right) => left.name.localeCompare(right.name));
        const sortedExpectedGroups = [...expectedGroups].sort((left, right) =>
          left.name.localeCompare(right.name)
        );

        expect(groups).toHaveLength(expectedGroups.length);
        expect(sortedGroups).toMatchObject(sortedExpectedGroups);
      }
    );

    it('should return empty array when user has no group on the service instance', async () => {
      // Given
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        group_id: readerGroupId,
      });

      // When
      const groups =
        await ServiceGroupDomain.loadServiceGroupsByServiceInstanceAndUser(
          serviceInstanceId1,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
        );

      // Then
      expect(groups).toMatchObject([]);
    });
  });
});
