import { v4 as uuidv4 } from 'uuid';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import {
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import {
  DeploymentRequestHubStatus,
  PlatformIdentifier,
  ServiceGroupName,
  ServiceInstanceCreationStatus,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import * as mailService from '../../../server/mail-service';
import { auth0ClientMock } from '../../../thirdparty/auth0/mock';
import { ErrorCode } from '../../../utils/error/error.code';
import { formatName } from '../../../utils/format';

import { TestHelper } from '../../../../tests/helper/test.helper';
import { ServiceInstanceDomain } from '../../service/instance/service-instance.domain';
import { ServiceGroupApp } from './service-group.app';

describe('serviceGroupApp', () => {
  const adminGroupId = uuidv4() as ServiceGroupId;
  const analystGroupId = uuidv4() as ServiceGroupId;
  const adminGroupIdServiceInstance2 = uuidv4() as ServiceGroupId;
  const analystGroupIdServiceInstance2 = uuidv4() as ServiceGroupId;

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
      id: adminGroupIdServiceInstance2,
      name: 'Admin',
      service_instance_id: serviceInstanceId2,
    });
    await TestHelper.serviceGroup.create({
      id: analystGroupIdServiceInstance2,
      name: 'Analyst',
      service_instance_id: serviceInstanceId2,
    });
  });

  describe('updateGroups', () => {
    afterEach(async () => {
      for (const groupId of [
        adminGroupId,
        analystGroupId,
        adminGroupIdServiceInstance2,
        analystGroupIdServiceInstance2,
      ]) {
        await TestHelper.serviceGroupUser.delete({ group_id: groupId });
      }

      for (const serviceInstanceId of [
        serviceInstanceId1,
        serviceInstanceId2,
      ]) {
        await TestHelper.deploymentRequest.delete({
          service_instance_id: serviceInstanceId,
        });
        await TestHelper.subscription.delete({
          service_instance_id: serviceInstanceId,
        });
        await TestHelper.platformConfiguration.delete({
          service_instance_id: serviceInstanceId,
        });
      }
    });

    const payload = [
      {
        id: adminGroupId,
        userIds: [
          TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        ],
      },
      {
        id: analystGroupId,
        userIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID],
      },
    ];

    it('should prevent user from updating groups in multiple service instances', async () => {
      const call = ServiceGroupApp.updateGroups([
        ...payload,
        {
          id: adminGroupIdServiceInstance2,
          userIds: [
            TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
          ],
        },
      ]);

      await expect(call).rejects.toThrow(
        ErrorCode.ServiceGroupsLinkedToMultipleServiceInstances
      );
    });

    it('should prevent user from updating groups in another organization than selected', async () => {
      await TestHelper.subscription.create({
        service_instance_id: serviceInstanceId1,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      requestContext.set(requestContextAdminSecondOrga);
      const call = ServiceGroupApp.updateGroups(payload);

      await expect(call).rejects.toThrow(
        ErrorCode.OrganizationDoesNotMatchSelectedOrganization
      );
    });

    it('should allow bypass user to update groups in another organization', async () => {
      requestContext.set(requestContextAdminUser);

      await TestHelper.subscription.create({
        service_instance_id: serviceInstanceId2,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      await TestHelper.deploymentRequest.create({
        service_instance_id: serviceInstanceId2,
        user_requester_id:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        organization_requester_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const bypassPayload = [
        {
          id: adminGroupIdServiceInstance2,
          userIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID],
        },
        {
          id: analystGroupIdServiceInstance2,
          userIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID],
        },
      ];

      const result = await ServiceGroupApp.updateGroups(bypassPayload);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
    });

    it('should update groups with new user list and remove old ones', async () => {
      requestContext.set(requestContextAdminUser);

      await TestHelper.serviceGroupUser.create({
        group_id: analystGroupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstanceId1,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
      await TestHelper.deploymentRequest.create({
        service_instance_id: serviceInstanceId1,
        user_requester_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        organization_requester_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      const result = await ServiceGroupApp.updateGroups(payload);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);

      const admins = await TestHelper.serviceGroupUser.load({
        group_id: adminGroupId,
      });

      expect(admins).toHaveLength(2);
      expect(
        admins!.find(
          ({ user_id }) =>
            user_id === TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
        )
      ).toBeTruthy();
      expect(
        admins!.find(
          ({ user_id }) =>
            user_id ===
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
        )
      ).toBeTruthy();

      const analysts = await TestHelper.serviceGroupUser.load({
        group_id: analystGroupId,
      });

      expect(analysts).toHaveLength(1);
      expect(analysts?.[0]?.user_id).toBe(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID
      );
    });
  });

  describe('removeExpiredGroups', () => {
    let auth0Spy: MockInstance;
    const trackedServiceInstanceIds: ServiceInstanceId[] = [];

    beforeEach(() => {
      auth0Spy = vi.spyOn(auth0ClientMock, 'updateUserRBACInstance');
    });

    afterEach(async () => {
      if (trackedServiceInstanceIds.length > 0) {
        for (const serviceInstanceId of trackedServiceInstanceIds) {
          await TestHelper.deploymentRequest.delete({
            service_instance_id: serviceInstanceId,
          });
          await TestHelper.subscription.delete({
            service_instance_id: serviceInstanceId,
          });
          await TestHelper.serviceGroup.delete({
            service_instance_id: serviceInstanceId,
          });
        }

        for (const id of trackedServiceInstanceIds) {
          await ServiceInstanceDomain.deleteServiceInstanceBy({ id });
        }
        trackedServiceInstanceIds.length = 0;
      }
    });

    it.each([
      DeploymentRequestHubStatus.Expired,
      DeploymentRequestHubStatus.Cancelled,
    ])('should remove users from groups for a %s trial', async (hub_status) => {
      // Given
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 8);
      const platformId = uuidv4();

      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status,
            end_date: endDate,
            platform_id: platformId,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: deploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        group_id: groupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

      // When
      await ServiceGroupApp.removeExpiredGroups();

      // Then
      const usersInGroup = await TestHelper.serviceGroupUser.load({
        group_id: groupId,
      });
      expect(usersInGroup).toEqual([]);

      const groups = await TestHelper.serviceGroup.load({
        id: groupId,
      });

      expect(groups).toEqual([]);
    });

    it('should call auth0 with empty groups for each affected user', async () => {
      // Given
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 8);
      const platformId = uuidv4();

      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            end_date: endDate,
            platform_id: platformId,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: deploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        group_id: groupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });
      await TestHelper.serviceGroupUser.create({
        group_id: groupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });

      // When
      await ServiceGroupApp.removeExpiredGroups();

      // Then
      expect(auth0Spy).toHaveBeenCalledTimes(2);
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        { [platformId]: { groups: [] } }
      );
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        { [platformId]: { groups: [] } }
      );
    });

    it('should not remove users from DB when auth0 call fails', async () => {
      // Given
      auth0Spy.mockRejectedValue(new Error('Auth0 failure'));

      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 8);
      const platformId = uuidv4();

      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          {
            hub_status: DeploymentRequestHubStatus.Expired,
            end_date: endDate,
            platform_id: platformId,
          }
        );
      trackedServiceInstanceIds.push(deploymentRequest.service_instance_id);

      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: deploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        group_id: groupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

      // When
      await ServiceGroupApp.removeExpiredGroups();

      // Then
      const usersInGroup = await TestHelper.serviceGroupUser.load({
        group_id: groupId,
      });
      expect(usersInGroup).toMatchObject([
        {
          group_id: groupId,
          user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        },
      ]);

      const groups = await TestHelper.serviceGroup.load({
        id: groupId,
      });
      expect(groups).toHaveLength(1);
    });

    it('should not call auth0 when there are no expired groups', async () => {
      // When
      await ServiceGroupApp.removeExpiredGroups();

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
    });
  });

  describe('loadBundleUserServiceGroups', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    it('should return groups pivoted per user across the bundle children', async () => {
      // Given
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            { platform_identifier: PlatformIdentifier.Opencti },
            { platform_identifier: PlatformIdentifier.Openaev },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiDeploymentRequest, openaevDeploymentRequest] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      const openaevObserverGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: 'Admin',
        service_instance_id: openctiDeploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: openaevObserverGroupId,
        name: 'Observer',
        service_instance_id: openaevDeploymentRequest.service_instance_id,
      });

      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: openctiAdminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: openaevObserverGroupId,
      });

      // When
      const result = await ServiceGroupApp.loadBundleUserServiceGroups(
        bundle.service_instance_id
      );

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]?.user.id).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
      );
      expect(result[0]?.groups).toEqual(
        expect.arrayContaining([
          { platformIdentifier: PlatformIdentifier.Opencti, name: 'Admin' },
          {
            platformIdentifier: PlatformIdentifier.Openaev,
            name: 'Observer',
          },
        ])
      );
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupApp.loadBundleUserServiceGroups(
        bundleServiceInstanceId
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });

  describe('loadBundleProducts', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    it('should return the platform identifiers of the bundle children', async () => {
      // Given
      const { bundle } = await TestHelper.deploymentRequest.createBundle({
        children: [
          { platform_identifier: PlatformIdentifier.Opencti },
          { platform_identifier: PlatformIdentifier.Xtmone },
        ],
      });
      createdBundleIds.push(bundle.id);

      // When
      const result = await ServiceGroupApp.loadBundleProducts(
        bundle.service_instance_id
      );

      // Then
      expect(result).toEqual(
        expect.arrayContaining([
          PlatformIdentifier.Opencti,
          PlatformIdentifier.Xtmone,
        ])
      );
      expect(result).not.toContain(PlatformIdentifier.Openaev);
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupApp.loadBundleProducts(bundleServiceInstanceId);

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });

  describe('addUsersToBundleGroups', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      vi.useRealTimers();
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    const createBundleWithGroups = async (opts?: { endDate?: Date }) => {
      const openctiPlatformId = uuidv4();
      const xtmonePlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: opts?.endDate },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              platform_id: openctiPlatformId,
              end_date: opts?.endDate,
            },
            {
              platform_identifier: PlatformIdentifier.Xtmone,
              platform_id: xtmonePlatformId,
              end_date: opts?.endDate,
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild, xtmoneChild] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      const openctiReaderGroupId = uuidv4() as ServiceGroupId;
      const xtmoneUserGroupId = uuidv4() as ServiceGroupId;
      const xtmoneAdminGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: openctiReaderGroupId,
        name: 'Reader',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneUserGroupId,
        name: 'User',
        service_instance_id: xtmoneChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneAdminGroupId,
        name: 'Admin',
        service_instance_id: xtmoneChild!.service_instance_id,
      });

      return {
        bundle,
        openctiChild: openctiChild!,
        xtmoneChild: xtmoneChild!,
        groups: {
          openctiAdminGroupId,
          openctiReaderGroupId,
          xtmoneUserGroupId,
          xtmoneAdminGroupId,
        },
      };
    };

    it('should throw XtmOneRoleRequired when no XTM One role is provided', async () => {
      // Given
      const { bundle } = await createBundleWithGroups();

      // When
      const call = ServiceGroupApp.addUsersToBundleGroups(
        bundle.service_instance_id,
        {
          userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
          roles: [
            {
              product: PlatformIdentifier.Opencti,
              role: ServiceGroupName.Admin,
            },
          ],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.XtmOneRoleRequired);
    });

    it('should throw UserIsNotInOrganization when a userId does not belong to the bundle organization', async () => {
      // Given
      const { bundle } = await createBundleWithGroups();

      // When
      const call = ServiceGroupApp.addUsersToBundleGroups(
        bundle.service_instance_id,
        {
          userIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID],
          roles: [
            {
              product: PlatformIdentifier.Opencti,
              role: ServiceGroupName.Admin,
            },
            {
              product: PlatformIdentifier.Xtmone,
              role: ServiceGroupName.User,
            },
          ],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should add users to the target group per platform and skip platforms not part of the bundle', async () => {
      // Given
      const { bundle, groups } = await createBundleWithGroups();

      // When
      const result = await ServiceGroupApp.addUsersToBundleGroups(
        bundle.service_instance_id,
        {
          userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
          roles: [
            {
              product: PlatformIdentifier.Opencti,
              role: ServiceGroupName.Admin,
            },
            // OpenAEV isn't part of this bundle: should be silently ignored.
            {
              product: PlatformIdentifier.Openaev,
              role: ServiceGroupName.Observer,
            },
            { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          ],
        }
      );

      // Then
      const openctiMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      const xtmoneMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.xtmoneUserGroupId,
      });
      expect(openctiMembers?.map((member) => member.user_id)).toEqual([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      expect(xtmoneMembers?.map((member) => member.user_id)).toEqual([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
            }),
            groups: expect.arrayContaining([
              { platformIdentifier: PlatformIdentifier.Opencti, name: 'Admin' },
              { platformIdentifier: PlatformIdentifier.Xtmone, name: 'User' },
            ]),
          }),
        ])
      );
    });

    it('should be idempotent when a user is added twice to the same group (relies on ON CONFLICT IGNORE)', async () => {
      // Given
      const { bundle, groups } = await createBundleWithGroups();

      // When
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      const adminMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      const xtmoneMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.xtmoneUserGroupId,
      });
      expect(adminMembers?.map((member) => member.user_id)).toEqual([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      expect(xtmoneMembers?.map((member) => member.user_id)).toEqual([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
    });

    it('should persist additions from two sequential calls for different users on the same group (no lost update)', async () => {
      // Given
      const { bundle, groups } = await createBundleWithGroups();

      // When
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        roles: [
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID],
        roles: [
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      const members = await TestHelper.serviceGroupUser.load({
        group_id: groups.xtmoneUserGroupId,
      });
      expect(members?.map((member) => member.user_id)).toEqual(
        expect.arrayContaining([
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
          TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        ])
      );
    });

    it('should sync Auth0 RBAC groups for all submitted users and email each of them a single XTM Platform trial invitation', async () => {
      // Given
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-16T10:00:00.000Z'));
      const actingUserEmail = requestContextSimpleUserFiligran2.user.email;
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const endDate = new Date('2026-10-06T10:00:00.000Z');
      const { bundle, openctiChild, xtmoneChild } =
        await createBundleWithGroups({ endDate });

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
        ],
      });

      // Then
      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(targetUser.EMAIL, {
        [openctiChild.platform_id as string]: { groups: ['Admin'] },
        [xtmoneChild.platform_id as string]: { groups: ['User'] },
      });

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith({
        to: targetUser.EMAIL,
        template: 'free_trial_bundle_user_added',
        params: {
          firstName: formatName(targetUser.FIRST_NAME),
          adminEmail: actingUserEmail,
          productNames: 'OpenCTI and XTM One',
          products: [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone],
          daysLeft: 20,
          platformUrl: mailService.buildXtmPlatformTrialLink(),
        },
      });
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupApp.addUsersToBundleGroups(
        bundleServiceInstanceId,
        {
          userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
          roles: [
            { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          ],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });

  describe('removeUsersFromBundleGroups', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    const createBundleWithMember = async (opts?: {
      userId?: string;
      secondUserId?: string;
    }) => {
      const openctiPlatformId = uuidv4();
      const xtmonePlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              platform_id: openctiPlatformId,
            },
            {
              platform_identifier: PlatformIdentifier.Xtmone,
              platform_id: xtmonePlatformId,
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild, xtmoneChild] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      const xtmoneUserGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneUserGroupId,
        name: 'User',
        service_instance_id: xtmoneChild!.service_instance_id,
      });

      const userId =
        opts?.userId ?? TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID;
      await TestHelper.serviceGroupUser.create({
        user_id: userId,
        group_id: openctiAdminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: userId,
        group_id: xtmoneUserGroupId,
      });

      if (opts?.secondUserId) {
        await TestHelper.serviceGroupUser.create({
          user_id: opts.secondUserId,
          group_id: openctiAdminGroupId,
        });
      }

      return {
        bundle,
        openctiChild: openctiChild!,
        xtmoneChild: xtmoneChild!,
        groups: { openctiAdminGroupId, xtmoneUserGroupId },
      };
    };

    it('should remove the user from every service group tied to the bundle and sync Auth0 for each platform', async () => {
      // Given
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const { bundle, openctiChild, xtmoneChild, groups } =
        await createBundleWithMember({ userId: targetUser.ID });

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      // When
      const result = await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [targetUser.ID]
      );

      // Then
      expect(result).toEqual([targetUser.ID]);

      const openctiMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      const xtmoneMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.xtmoneUserGroupId,
      });
      expect(openctiMembers).toEqual([]);
      expect(xtmoneMembers).toEqual([]);

      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(targetUser.EMAIL, {
        [openctiChild.platform_id as string]: { groups: [] },
        [xtmoneChild.platform_id as string]: { groups: [] },
      });
    });

    it('should support removing several users at once and leave other members untouched', async () => {
      // Given
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const otherUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2;
      const { bundle, groups } = await createBundleWithMember({
        userId: targetUser.ID,
        secondUserId: otherUser.ID,
      });

      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      const result = await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [targetUser.ID, otherUser.ID]
      );

      // Then
      expect(result).toEqual([targetUser.ID, otherUser.ID]);
      const openctiMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      expect(openctiMembers).toEqual([]);
    });

    it('should be a no-op when the user has no membership in the bundle groups', async () => {
      // Given
      const { bundle } = await createBundleWithMember();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      const result = await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID]
      );

      // Then
      expect(result).toEqual([TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID]);
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupApp.removeUsersFromBundleGroups(
        bundleServiceInstanceId,
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID]
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });

  describe('updateBundleUserGroups', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    const createBundleWithMembers = async () => {
      const openctiPlatformId = uuidv4();
      const xtmonePlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              platform_id: openctiPlatformId,
            },
            {
              platform_identifier: PlatformIdentifier.Xtmone,
              platform_id: xtmonePlatformId,
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild, xtmoneChild] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      const openctiReaderGroupId = uuidv4() as ServiceGroupId;
      const xtmoneUserGroupId = uuidv4() as ServiceGroupId;
      const xtmoneAdminGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: openctiReaderGroupId,
        name: 'Reader',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneUserGroupId,
        name: 'User',
        service_instance_id: xtmoneChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneAdminGroupId,
        name: 'Admin',
        service_instance_id: xtmoneChild!.service_instance_id,
      });

      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const otherUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2;
      await TestHelper.serviceGroupUser.create({
        user_id: targetUser.ID,
        group_id: openctiAdminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: targetUser.ID,
        group_id: xtmoneUserGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: otherUser.ID,
        group_id: openctiAdminGroupId,
      });

      return {
        bundle,
        openctiChild: openctiChild!,
        xtmoneChild: xtmoneChild!,
        targetUser,
        otherUser,
        groups: {
          openctiAdminGroupId,
          openctiReaderGroupId,
          xtmoneUserGroupId,
          xtmoneAdminGroupId,
        },
      };
    };

    it('should update only the specified platform, leaving XTM One role untouched when no XTM One entry is provided', async () => {
      // Given
      const { bundle, targetUser, groups } = await createBundleWithMembers();

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Reader,
          },
        ],
      });

      // Then
      const readerMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiReaderGroupId,
      });
      const xtmoneUserMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.xtmoneUserGroupId,
      });
      expect(readerMembers?.map((member) => member.user_id)).toEqual([
        targetUser.ID,
      ]);
      expect(xtmoneUserMembers?.map((member) => member.user_id)).toEqual([
        targetUser.ID,
      ]);
    });

    it('should throw XtmOneRoleRequired when the XTM One role is explicitly null', async () => {
      // Given
      const { bundle, targetUser } = await createBundleWithMembers();

      // When
      const call = ServiceGroupApp.updateBundleUserGroups(
        bundle.service_instance_id,
        {
          userIds: [targetUser.ID],
          roles: [{ product: PlatformIdentifier.Xtmone, role: null }],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.XtmOneRoleRequired);
    });

    it('should throw UserIsNotInOrganization when a userId does not belong to the bundle organization', async () => {
      // Given
      const { bundle } = await createBundleWithMembers();

      // When
      const call = ServiceGroupApp.updateBundleUserGroups(
        bundle.service_instance_id,
        {
          userIds: [TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID],
          roles: [
            {
              product: PlatformIdentifier.Opencti,
              role: ServiceGroupName.Reader,
            },
          ],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should move the submitted user to the new role group and leave other members untouched', async () => {
      // Given
      const { bundle, targetUser, otherUser, groups } =
        await createBundleWithMembers();

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Reader,
          },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      const adminMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      const readerMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiReaderGroupId,
      });
      expect(adminMembers?.map((member) => member.user_id)).toEqual([
        otherUser.ID,
      ]);
      expect(readerMembers?.map((member) => member.user_id)).toEqual([
        targetUser.ID,
      ]);
    });

    it('should revoke access to an optional platform when its role is set to null, without affecting other users', async () => {
      // Given
      const { bundle, targetUser, otherUser, groups } =
        await createBundleWithMembers();

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: null },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      const adminMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      expect(adminMembers?.map((member) => member.user_id)).toEqual([
        otherUser.ID,
      ]);
    });

    it('should sync Auth0 RBAC groups for every affected platform, using an empty group list when revoked', async () => {
      // Given
      const { bundle, openctiChild, xtmoneChild, targetUser } =
        await createBundleWithMembers();
      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: null },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.Admin },
        ],
      });

      // Then
      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(targetUser.EMAIL, {
        [openctiChild.platform_id as string]: { groups: [] },
        [xtmoneChild.platform_id as string]: { groups: ['Admin'] },
      });
    });

    it('should support updating several users at once', async () => {
      // Given
      const { bundle, targetUser, otherUser, groups } =
        await createBundleWithMembers();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID, otherUser.ID],
        roles: [
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Reader,
          },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      const readerMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiReaderGroupId,
      });
      expect(readerMembers?.map((member) => member.user_id)).toEqual(
        expect.arrayContaining([targetUser.ID, otherUser.ID])
      );
    });

    it('should throw DeploymentRequestNotFound when the bundle has no deployment request', async () => {
      // Given
      const bundleServiceInstanceId = uuidv4() as ServiceInstanceId;

      // When
      const call = ServiceGroupApp.updateBundleUserGroups(
        bundleServiceInstanceId,
        {
          userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
          roles: [
            { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          ],
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });
  });
});
