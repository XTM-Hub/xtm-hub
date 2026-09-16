import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  DeploymentRequestDeploymentType,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  ServiceGroupName,
} from '../../../__generated__/resolvers-types';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import ServiceGroupModel, {
  ServiceGroupId,
} from '../../../model/kanel/public/ServiceGroup';
import ServiceGroupUser from '../../../model/kanel/public/ServiceGroupUser';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import * as mailService from '../../../server/mail-service';
import { auth0ClientMock } from '../../../thirdparty/auth0/mock';
import { ErrorCode } from '../../../utils/error/error.code';
import { formatName } from '../../../utils/format';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { UpdateGroupsPayload } from './service-group.app';
import { ServiceGroupHelper, UserGroups } from './service-group.helper';

describe('serviceGroupHelper', () => {
  const userId1 = 'u1' as UserId;
  const userId2 = 'u2' as UserId;

  const groupId1 = 'g1' as ServiceGroupId;
  const groupId2 = 'g2' as ServiceGroupId;
  const groupId3 = 'g3' as ServiceGroupId;

  describe('buildUserGroupsDiff', () => {
    it('should return an empty array when oldUsers and newUsers are empty', () => {
      const result = ServiceGroupHelper.buildUserGroupsDiff([], []);
      expect(result).toEqual([]);
    });

    it("should not return users whose groups haven't changed", () => {
      const oldUsers: ServiceGroupUser[] = [
        { user_id: userId1, group_id: groupId1 },
        { user_id: userId2, group_id: groupId2 },
      ];
      const newUsers: UpdateGroupsPayload = [
        { id: groupId1, userIds: [userId1] },
        { id: groupId2, userIds: [userId2] },
      ];

      const expected: UserGroups[] = [];

      const result = ServiceGroupHelper.buildUserGroupsDiff(oldUsers, newUsers);
      expect(result).toEqual(expected);
    });

    it('should mark a user as modified when all of their groups are removed', () => {
      const oldUsers: ServiceGroupUser[] = [
        { user_id: userId1, group_id: groupId1 },
        { user_id: userId1, group_id: groupId2 },
      ];
      const newUsers: UpdateGroupsPayload = [];

      const expected: UserGroups[] = [{ user_id: userId1, group_ids: [] }];

      const result = ServiceGroupHelper.buildUserGroupsDiff(oldUsers, newUsers);
      expect(result).toEqual(expected);
    });

    it('should mark a user as modified when they are completely new', () => {
      const oldUsers: ServiceGroupUser[] = [];
      const newUsers: UpdateGroupsPayload = [
        { id: groupId1, userIds: [userId1] },
        { id: groupId2, userIds: [userId1] },
      ];
      const expected: UserGroups[] = [
        {
          user_id: userId1,
          group_ids: [groupId1, groupId2],
        },
      ];

      const result = ServiceGroupHelper.buildUserGroupsDiff(oldUsers, newUsers);
      expect(result).toEqual(expected);
    });

    it('should handle when a user had multiple groups and now has fewer', () => {
      const oldUsers: ServiceGroupUser[] = [
        { user_id: userId1, group_id: groupId1 },
        { user_id: userId1, group_id: groupId2 },
        { user_id: userId1, group_id: groupId3 },
      ];
      const newUsers: UpdateGroupsPayload = [
        { id: groupId1, userIds: [userId1] },
      ];

      const expected: UserGroups[] = [
        { user_id: userId1, group_ids: [groupId1] },
      ];

      const result = ServiceGroupHelper.buildUserGroupsDiff(oldUsers, newUsers);
      expect(result).toEqual(expected);
    });

    it('should handle when a user gains new groups', () => {
      const oldUsers: ServiceGroupUser[] = [
        { user_id: userId1, group_id: groupId1 },
      ];
      const newUsers: UpdateGroupsPayload = [
        { id: groupId1, userIds: [userId1] },
        { id: groupId2, userIds: [userId1] },
        { id: groupId3, userIds: [userId1] },
      ];

      const expected: UserGroups[] = [
        {
          user_id: userId1,
          group_ids: [groupId1, groupId2, groupId3],
        },
      ];

      const result = ServiceGroupHelper.buildUserGroupsDiff(oldUsers, newUsers);
      expect(result).toEqual(expected);
    });
  });

  describe('toServiceGroupResponse', () => {
    it('should cast the service group name to a ServiceGroupName', () => {
      const serviceGroup: ServiceGroupModel = {
        id: groupId1,
        name: 'Admin',
        service_instance_id: 'si1' as ServiceInstanceId,
      };

      const result = ServiceGroupHelper.toServiceGroupResponse(serviceGroup);

      expect(result).toEqual({
        id: groupId1,
        name: ServiceGroupName.Admin,
        service_instance_id: 'si1',
      });
    });
  });

  describe('matchRolesToChildren', () => {
    const bundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of bundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      bundleIds.length = 0;
    });

    it('should match each role to its corresponding child by platform identifier', async () => {
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            { platform_identifier: PlatformIdentifier.Opencti },
            { platform_identifier: PlatformIdentifier.Openaev },
          ],
        });
      bundleIds.push(bundle.id);
      const [openctiChild, openaevChild] = children;

      const result = ServiceGroupHelper.matchRolesToChildren(children, [
        { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
        {
          product: PlatformIdentifier.Openaev,
          role: ServiceGroupName.Observer,
        },
      ]);

      expect(result).toEqual([
        { child: openctiChild, role: ServiceGroupName.Admin },
        { child: openaevChild, role: ServiceGroupName.Observer },
      ]);
    });

    it('should skip roles whose product has no matching child in the bundle', async () => {
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [{ platform_identifier: PlatformIdentifier.Opencti }],
        });
      bundleIds.push(bundle.id);

      const result = ServiceGroupHelper.matchRolesToChildren(children, [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ]);

      expect(result).toEqual([]);
    });

    it('should default a missing role to null', async () => {
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [{ platform_identifier: PlatformIdentifier.Opencti }],
        });
      bundleIds.push(bundle.id);
      const [openctiChild] = children;

      const result = ServiceGroupHelper.matchRolesToChildren(children, [
        { product: PlatformIdentifier.Opencti, role: null },
      ]);

      expect(result).toEqual([{ child: openctiChild, role: null }]);
    });
  });

  describe('loadEmailByUserId', () => {
    it('should return the users and a map of their emails', async () => {
      const result = await ServiceGroupHelper.loadEmailByUserId([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);

      expect(result.users.map((user) => user.id)).toEqual([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      expect(
        result.emailByUserId.get(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID)
      ).toBe(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL);
    });

    it('should return an empty map when no user matches', async () => {
      const result = await ServiceGroupHelper.loadEmailByUserId([
        uuidv4() as UserId,
      ]);

      expect(result.users).toEqual([]);
      expect(result.emailByUserId.size).toBe(0);
    });
  });

  describe('syncAuth0GroupsForChildren', () => {
    const bundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of bundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      bundleIds.length = 0;
    });

    it('should call auth0 once per user with the groups of children that have a platform_id', async () => {
      const openctiPlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              platform_id: openctiPlatformId,
            },
            { platform_identifier: PlatformIdentifier.Openaev },
          ],
        });
      bundleIds.push(bundle.id);
      const [openctiChild, openaevChild] = children;

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.syncAuth0GroupsForChildren(
        [
          { child: openctiChild!, groupNames: [ServiceGroupName.Admin] },
          { child: openaevChild!, groupNames: [ServiceGroupName.Observer] },
        ],
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        new Map([
          [
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
          ],
        ])
      );

      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        {
          [openctiPlatformId]: { groups: [ServiceGroupName.Admin] },
        }
      );
    });

    it('should not call auth0 when none of the children have a platform_id', async () => {
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [{ platform_identifier: PlatformIdentifier.Opencti }],
        });
      bundleIds.push(bundle.id);

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.syncAuth0GroupsForChildren(
        [{ child: children[0]!, groupNames: [ServiceGroupName.Admin] }],
        [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        new Map([
          [
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
          ],
        ])
      );

      expect(auth0Spy).not.toHaveBeenCalled();
    });

    it('should skip a user whose email could not be resolved', async () => {
      const openctiPlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              platform_id: openctiPlatformId,
            },
          ],
        });
      bundleIds.push(bundle.id);

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.syncAuth0GroupsForChildren(
        [{ child: children[0]!, groupNames: [ServiceGroupName.Admin] }],
        [uuidv4() as UserId],
        new Map()
      );

      expect(auth0Spy).not.toHaveBeenCalled();
    });
  });

  describe('sendFreeTrialWelcomeEmails', () => {
    const serviceInstanceIds: ServiceInstanceId[] = [];
    let simple2User: User;

    beforeAll(async () => {
      const users = await UserDomain.loadUsers([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      simple2User = users[0]!;
    });

    afterEach(async () => {
      for (const serviceInstanceId of serviceInstanceIds) {
        await TestHelper.platformConfiguration.delete({
          service_instance_id: serviceInstanceId,
        });
        await TestHelper.serviceInstance.delete({ id: serviceInstanceId });
      }
      serviceInstanceIds.length = 0;
      vi.restoreAllMocks();
    });

    const createPlatformConfiguration = async (
      platformId: string,
      platformUrl: string
    ) => {
      const serviceInstance = await TestHelper.serviceInstance.create({});
      const serviceInstanceId = serviceInstance.id;
      serviceInstanceIds.push(serviceInstanceId);
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstanceId,
        status: PlatformConfigurationStatus.Active,
        platform_id: platformId,
        platform_url: platformUrl,
        registerer_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        platform_title: 'Test Platform',
        platform_version: '1.0.0',
        platform_contract: PlatformContract.Ee,
        token: uuidv4(),
      });
    };

    it('should send a free_trial_user_added email to each newly added user', async () => {
      const platformId = uuidv4();
      const platformUrl = 'https://test-platform.example.com';
      const endDate = new Date('2026-06-01');
      await createPlatformConfiguration(platformId, platformUrl);

      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      const expectedTrialEndDate = endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
      });

      await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
        platformId,
        platformIdentifier: PlatformIdentifier.Opencti,
        deploymentType: DeploymentRequestDeploymentType.Trial,
        endDate,
        newlyAddedUsers: [simple2User],
        adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
      });

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        template: 'free_trial_user_added',
        params: {
          firstName: formatName(
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME
          ),
          platformUrl,
          platformIdentifier: PlatformIdentifier.Opencti,
          adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
          trialEndDate: expectedTrialEndDate,
        },
      });
    });

    it.each([
      ['platformId', null, PlatformIdentifier.Opencti],
      ['platformIdentifier', uuidv4(), null],
    ])(
      'should do nothing when %s is missing',
      async (_field, platformId, platformIdentifier) => {
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);

        await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
          platformId,
          platformIdentifier,
          deploymentType: DeploymentRequestDeploymentType.Trial,
          endDate: new Date(),
          newlyAddedUsers: [simple2User],
          adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        });

        expect(sendMailSpy).not.toHaveBeenCalled();
      }
    );

    it('should do nothing when there are no newly added users', async () => {
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
        platformId: uuidv4(),
        platformIdentifier: PlatformIdentifier.Opencti,
        deploymentType: DeploymentRequestDeploymentType.Trial,
        endDate: new Date(),
        newlyAddedUsers: [],
        adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should do nothing when there is no matching platform configuration', async () => {
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
        platformId: uuidv4(),
        platformIdentifier: PlatformIdentifier.Opencti,
        deploymentType: DeploymentRequestDeploymentType.Trial,
        endDate: new Date(),
        newlyAddedUsers: [simple2User],
        adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should do nothing when the deployment type is not Trial', async () => {
      const platformId = uuidv4();
      await createPlatformConfiguration(
        platformId,
        'https://test-platform.example.com'
      );

      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
        platformId,
        platformIdentifier: PlatformIdentifier.Opencti,
        deploymentType: DeploymentRequestDeploymentType.Bundle,
        endDate: new Date(),
        newlyAddedUsers: [simple2User],
        adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should do nothing when there is no end date', async () => {
      const platformId = uuidv4();
      await createPlatformConfiguration(
        platformId,
        'https://test-platform.example.com'
      );

      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.sendFreeTrialWelcomeEmails({
        platformId,
        platformIdentifier: PlatformIdentifier.Opencti,
        deploymentType: DeploymentRequestDeploymentType.Trial,
        endDate: null,
        newlyAddedUsers: [simple2User],
        adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
      });

      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should swallow errors raised while sending emails', async () => {
      const platformId = uuidv4();
      await createPlatformConfiguration(
        platformId,
        'https://test-platform.example.com'
      );

      vi.spyOn(mailService, 'sendMail').mockRejectedValue(
        new Error('smtp down')
      );

      await expect(
        ServiceGroupHelper.sendFreeTrialWelcomeEmails({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          deploymentType: DeploymentRequestDeploymentType.Trial,
          endDate: new Date(),
          newlyAddedUsers: [simple2User],
          adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('sendFreeTrialBundleWelcomeEmails', () => {
    let simple2User: User;
    let bypassUser: User;

    beforeAll(async () => {
      const users = await UserDomain.loadUsers([
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      ]);
      simple2User = users.find(
        (user) => user.id === TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
      )!;
      bypassUser = users.find(
        (user) => user.id === TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      )!;
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should send a single free_trial_bundle_user_added email to each newly added user', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-16T10:00:00.000Z'));
      const endDate = new Date('2026-10-01T10:00:00.000Z');
      const adminEmail = 'admin@filigran.io';

      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      await ServiceGroupHelper.sendFreeTrialBundleWelcomeEmails({
        endDate,
        products: [PlatformIdentifier.Xtmone, PlatformIdentifier.Opencti],
        newlyAddedUsers: [simple2User, bypassUser],
        adminEmail,
      });

      const expectedParams = {
        adminEmail,
        productNames: 'OpenCTI and XTM One',
        products: [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone],
        daysLeft: 15,
        platformUrl: mailService.buildXtmPlatformTrialLink(),
      };
      expect(sendMailSpy).toHaveBeenCalledTimes(2);
      expect(sendMailSpy).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        template: 'free_trial_bundle_user_added',
        params: {
          firstName: formatName(
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.FIRST_NAME
          ),
          ...expectedParams,
        },
      });
      expect(sendMailSpy).toHaveBeenCalledWith({
        to: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
        template: 'free_trial_bundle_user_added',
        params: {
          firstName: formatName(
            TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.FIRST_NAME
          ),
          ...expectedParams,
        },
      });
    });

    it.each([
      ['there is no end date', null, [PlatformIdentifier.Opencti], true],
      ['there are no products', new Date(), [], true],
      [
        'there are no newly added users',
        new Date(),
        [PlatformIdentifier.Opencti],
        false,
      ],
    ])(
      'should do nothing when %s',
      async (_description, endDate, products, withUsers) => {
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);

        await ServiceGroupHelper.sendFreeTrialBundleWelcomeEmails({
          endDate,
          products,
          newlyAddedUsers: withUsers ? [simple2User] : [],
          adminEmail: 'admin@filigran.io',
        });

        expect(sendMailSpy).not.toHaveBeenCalled();
      }
    );

    it('should swallow errors raised while sending emails', async () => {
      vi.spyOn(mailService, 'sendMail').mockRejectedValue(
        new Error('smtp down')
      );

      await expect(
        ServiceGroupHelper.sendFreeTrialBundleWelcomeEmails({
          endDate: new Date(),
          products: [PlatformIdentifier.Opencti],
          newlyAddedUsers: [simple2User],
          adminEmail: 'admin@filigran.io',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('updateAuth0Groups', () => {
    const bundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const bundleId of bundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      bundleIds.length = 0;
      vi.restoreAllMocks();
    });

    it('should throw DeploymentRequestNotFound when there is no deployment request for the service instance', async () => {
      const call = ServiceGroupHelper.updateAuth0Groups(
        [],
        [],
        uuidv4() as ServiceInstanceId
      );

      await expect(call).rejects.toThrow(ErrorCode.DeploymentRequestNotFound);
    });

    it('should throw InvalidPlatformId when the deployment request has no platform_id', async () => {
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { platform_id: null }
        );
      bundleIds.push(deploymentRequest.id);

      const call = ServiceGroupHelper.updateAuth0Groups(
        [],
        [],
        deploymentRequest.service_instance_id
      );

      await expect(call).rejects.toThrow(ErrorCode.InvalidPlatformId);
    });

    it('should call auth0 with the new groups for each updated user', async () => {
      const platformId = uuidv4();
      const deploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { platform_id: platformId }
        );
      bundleIds.push(deploymentRequest.id);

      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: deploymentRequest.service_instance_id,
      });

      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      const oldUsers: ServiceGroupUser[] = [];
      const newUsers: UpdateGroupsPayload = [
        {
          id: groupId,
          userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        },
      ];

      await ServiceGroupHelper.updateAuth0Groups(
        oldUsers,
        newUsers,
        deploymentRequest.service_instance_id
      );

      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        { [platformId]: { groups: ['Admin'] } }
      );
    });
  });
});
