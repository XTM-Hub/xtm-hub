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
  OrganizationCapability,
  PlatformIdentifier,
  ServiceGroupName,
  ServiceInstanceCreationStatus,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { databaseContext } from '../../../context/database.context';
import { requestContext } from '../../../context/request.context';
import { DeploymentRequestId } from '../../../model/kanel/public/DeploymentRequest';
import { ServiceGroupId } from '../../../model/kanel/public/ServiceGroup';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import type { UserLoadUserBy } from '../../../model/user';
import * as mailService from '../../../server/mail-service';
import { auth0ClientMock } from '../../../thirdparty/auth0/mock';
import * as Hubspot from '../../../thirdparty/hubspot/hubspot';
import { PgBossProducer } from '../../../thirdparty/pgboss/producer';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { isFeatureEnabled } from '../../../utils/feature-flag.util';
import { formatName } from '../../../utils/format';

import { TestHelper } from '../../../../tests/helper/test.helper';
import { UserDomain } from '../../organization-management/user/user-domain/user.domain';
import { ServiceInstanceDomain } from '../../service/instance/service-instance.domain';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { ServiceGroupApp } from './service-group.app';

const loadUser = async (userId: UserId): Promise<User> => {
  const [user] = await UserDomain.loadUsers([userId]);
  return user!;
};

const FREE_TRIAL_BUNDLE_USER_ADDED_TEMPLATE = 'free_trial_bundle_user_added';

// Mocked (disabled by default) so tests don't depend on the local `enabled_features` config
vi.mock('../../../utils/feature-flag.util', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../../utils/feature-flag.util')
  >()),
  isFeatureEnabled: vi.fn(() => false),
}));

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

  let telemetrySpy: MockInstance;

  beforeEach(() => {
    telemetrySpy = vi
      .spyOn(TelemetryApp, 'sendTelemetryEvent')
      .mockResolvedValue();
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

    it('should not send trial_access_removed telemetry when a bundle trial expires', async () => {
      // Given
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 8);

      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          children: [
            {
              hub_status: DeploymentRequestHubStatus.Expired,
              end_date: endDate,
              platform_id: uuidv4(),
            },
          ],
        });
      const [child] = children;
      trackedServiceInstanceIds.push(
        bundle.service_instance_id,
        child!.service_instance_id
      );

      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: child!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        group_id: groupId,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

      // When
      await ServiceGroupApp.removeExpiredGroups();

      // Then
      expect(telemetrySpy).not.toHaveBeenCalled();
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
    const inTenDays = () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

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

    it('should keep only the first role when the same product is submitted twice', async () => {
      // Given
      const { bundle, groups } = await createBundleWithGroups({
        endDate: inTenDays(),
      });
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
        roles: [
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Reader,
          },
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
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      ]);
      expect(readerMembers).toEqual([]);
      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            productNames: 'OpenCTI and XTM One',
            products: [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone],
          }),
        })
      );
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
      const { bundle, groups } = await createBundleWithGroups({
        endDate: inTenDays(),
      });
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);

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
      expect(sendMailSpy).toHaveBeenCalledTimes(1);
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
      expect(auth0Spy).toHaveBeenCalledWith(
        targetUser.EMAIL,
        {
          [openctiChild.platform_id as string]: { groups: ['Admin'] },
          [xtmoneChild.platform_id as string]: { groups: ['User'] },
        },
        undefined
      );

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

    it('should send a trial_access_granted telemetry event per (user, product) with the acting admin as user_id', async () => {
      // Given
      const actingUser = requestContextSimpleUserFiligran2.user;
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const { bundle, openctiChild, xtmoneChild } =
        await createBundleWithGroups();

      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then
      expect(telemetrySpy).toHaveBeenCalledTimes(2);
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_GRANTED,
          organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          user_id: actingUser.id,
          deployment_id: openctiChild.id,
          role: ServiceGroupName.Admin,
          email: targetUser.EMAIL,
        })
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_GRANTED,
          user_id: actingUser.id,
          deployment_id: xtmoneChild.id,
          role: ServiceGroupName.User,
          email: targetUser.EMAIL,
        })
      );
    });

    it('should not re-send trial_access_granted telemetry when the same role is granted again for an already-added user', async () => {
      // Given
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const { bundle, openctiChild, xtmoneChild } =
        await createBundleWithGroups();

      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);

      // When: same call is issued twice (e.g. a client retry), the DB insert
      // is a no-op the second time (ON CONFLICT IGNORE)
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });
      telemetrySpy.mockClear();
      await ServiceGroupApp.addUsersToBundleGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then: no duplicate trial_access_granted event is sent for the retry
      expect(telemetrySpy).not.toHaveBeenCalled();
      expect(openctiChild).toBeDefined();
      expect(xtmoneChild).toBeDefined();
    });

    it('should persist the grant and send telemetry, then propagate an error, when Auth0 RBAC sync fails for a user', async () => {
      // Given
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const { bundle, groups, openctiChild } = await createBundleWithGroups();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockRejectedValue(
        new Error('Auth0 failure')
      );

      // When
      const call = ServiceGroupApp.addUsersToBundleGroups(
        bundle.service_instance_id,
        {
          userIds: [targetUser.ID],
          roles: [
            {
              product: PlatformIdentifier.Opencti,
              role: ServiceGroupName.Admin,
            },
            { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
          ],
        }
      );

      // Then: the caller gets an explicit failure so it can retry, while the
      // DB (our reference) and telemetry already reflect the grant
      await expect(call).rejects.toThrow('Auth0 failure');
      const adminMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      expect(adminMembers?.map((member) => member.user_id)).toEqual([
        targetUser.ID,
      ]);
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_GRANTED,
          deployment_id: openctiChild.id,
          email: targetUser.EMAIL,
        })
      );
    });

    it.each([UserAccountStatus.Waiting, UserAccountStatus.Expired])(
      'should store the trial access in DB only, without Auth0 sync nor welcome email, when the user is %s',
      async (status) => {
        // Given
        const { user: member } = await TestHelper.user.insertInOrganization(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          { status }
        );
        const { bundle, groups } = await createBundleWithGroups({
          endDate: inTenDays(),
        });
        const auth0Spy = vi
          .spyOn(auth0ClientMock, 'updateUserRBACInstance')
          .mockResolvedValue(undefined);
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [member.id],
            roles: [
              {
                product: PlatformIdentifier.Xtmone,
                role: ServiceGroupName.User,
              },
            ],
          }
        );

        // Then
        const members = await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        });
        expect(members?.map(({ user_id }) => user_id)).toEqual([member.id]);
        expect(auth0Spy).not.toHaveBeenCalled();
        expect(sendMailSpy).not.toHaveBeenCalled();
        expect(telemetrySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: TelemetryEventType.TRIAL_ACCESS_GRANTED,
            email: member.email,
          })
        );
      }
    );

    describe('with emails input', () => {
      const xtmoneUserRoles = [
        { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
      ];

      beforeEach(() => {
        vi.mocked(isFeatureEnabled).mockReturnValue(true);
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
          undefined
        );
      });

      afterEach(() => {
        vi.mocked(isFeatureEnabled).mockReturnValue(false);
      });

      const addNewEmailAlongWithSelectedUser = async () => {
        const { bundle, groups } = await createBundleWithGroups({
          endDate: inTenDays(),
        });
        const auth0Spy = vi
          .spyOn(auth0ClientMock, 'updateUserRBACInstance')
          .mockResolvedValue(undefined);
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);
        const hubspotInviteSpy = vi
          .spyOn(Hubspot, 'hubspotInviteUserHook')
          .mockResolvedValue(undefined);
        const email = `new-${uuidv4()}@filigran.io`;

        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
            emails: [email, ` ${email} `],
            roles: xtmoneUserRoles,
          }
        );

        return { groups, email, auth0Spy, sendMailSpy, hubspotInviteSpy };
      };

      it('should ignore the emails input and only add the selected users when the TRIAL_INVITE feature flag is disabled', async () => {
        // Given
        vi.mocked(isFeatureEnabled).mockReturnValue(false);
        const { bundle, groups } = await createBundleWithGroups();
        vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
        const email = `new-${uuidv4()}@filigran.io`;

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
            emails: [email],
            roles: xtmoneUserRoles,
          }
        );

        // Then
        const members = await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        });
        expect(members?.map(({ user_id }) => user_id)).toEqual([
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        ]);
        expect(await TestHelper.user.loadAll({ email })).toEqual([]);
      });

      it('should add a single waiting user to the bundle organization and invite them through HubSpot when a new email is given', async () => {
        // Given / When
        const { email, hubspotInviteSpy } =
          await addNewEmailAlongWithSelectedUser();

        // Then
        const createdUsers = await TestHelper.user.loadAll({ email });
        expect(createdUsers).toEqual([
          expect.objectContaining({ status: UserAccountStatus.Waiting }),
        ]);
        expect(
          await TestHelper.user_Organization.load({
            user_id: createdUsers[0]!.id,
            organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
          })
        ).toBeDefined();
        expect(hubspotInviteSpy).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ email })
        );
      });

      it('should store the new user trial access in DB only, while syncing Auth0 and emailing the selected user, when a new email is given', async () => {
        // Given / When
        const { groups, email, auth0Spy, sendMailSpy } =
          await addNewEmailAlongWithSelectedUser();

        // Then
        const [createdUser] = await TestHelper.user.loadAll({ email });
        const members = await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        });
        expect(members?.map(({ user_id }) => user_id)).toEqual(
          expect.arrayContaining([
            TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
            createdUser!.id,
          ])
        );
        expect(auth0Spy).toHaveBeenCalledExactlyOnceWith(
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
          expect.anything(),
          undefined
        );
        const trialMailRecipients = sendMailSpy.mock.calls.flatMap(([mail]) =>
          mail.template === FREE_TRIAL_BUNDLE_USER_ADDED_TEMPLATE
            ? [mail.to]
            : []
        );
        expect(trialMailRecipients).toEqual([
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        ]);
      });

      it('should sync Auth0 and send the welcome email at first login when the user was invited from the trial', async () => {
        // Given
        const { bundle, children } =
          await TestHelper.deploymentRequest.createBundle({
            bundle: { end_date: inTenDays() },
            children: [
              {
                platform_identifier: PlatformIdentifier.Xtmone,
                hub_status: DeploymentRequestHubStatus.Active,
                platform_id: uuidv4(),
                end_date: inTenDays(),
              },
            ],
          });
        createdBundleIds.push(bundle.id);
        const [xtmoneChild] = children;
        await TestHelper.serviceGroup.create({
          id: uuidv4() as ServiceGroupId,
          name: 'User',
          service_instance_id: xtmoneChild!.service_instance_id,
        });
        const auth0Spy = vi
          .spyOn(auth0ClientMock, 'updateUserRBACInstance')
          .mockResolvedValue(undefined);
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);
        vi.spyOn(Hubspot, 'hubspotInviteUserHook').mockResolvedValue(undefined);
        const email = `new-${uuidv4()}@filigran.io`;
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [], emails: [email], roles: xtmoneUserRoles }
        );
        expect(auth0Spy).not.toHaveBeenCalled();
        const [createdUser] = await TestHelper.user.loadAll({ email });
        const invitedUser = await UserDomain.loadUserBy({
          'User.id': createdUser!.id,
        });

        // When
        await ServiceGroupApp.grantAccessIfWaiting(invitedUser!);

        // Then
        expect(auth0Spy).toHaveBeenCalledWith(
          email,
          { [xtmoneChild!.platform_id as string]: { groups: ['User'] } },
          undefined
        );
        expect(sendMailSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            to: email,
            template: FREE_TRIAL_BUNDLE_USER_ADDED_TEMPLATE,
          })
        );
        expect(
          (await TestHelper.user.load({ id: createdUser!.id })).status
        ).toBeNull();
      });

      it.each([
        { addedBy: 'selection', byEmail: false },
        { addedBy: 'email', byEmail: true },
      ])(
        'should re-invite an expired organization member and store their trial access when added by $addedBy',
        async ({ byEmail }) => {
          // Given
          const { user: member } = await TestHelper.user.insertInOrganization(
            TEST_ORGANIZATIONS.FILIGRAN.ID,
            { status: UserAccountStatus.Expired }
          );
          const { bundle, groups } = await createBundleWithGroups();
          const auth0Spy = vi
            .spyOn(auth0ClientMock, 'updateUserRBACInstance')
            .mockResolvedValue(undefined);
          const hubspotInviteSpy = vi
            .spyOn(Hubspot, 'hubspotInviteUserHook')
            .mockResolvedValue(undefined);

          // When
          await ServiceGroupApp.addUsersToBundleGroups(
            bundle.service_instance_id,
            {
              userIds: byEmail ? [] : [member.id],
              emails: byEmail ? [member.email] : null,
              roles: xtmoneUserRoles,
            }
          );

          // Then
          expect((await TestHelper.user.load({ id: member.id })).status).toBe(
            UserAccountStatus.Waiting
          );
          expect(hubspotInviteSpy).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ email: member.email })
          );
          const members = await TestHelper.serviceGroupUser.load({
            group_id: groups.xtmoneUserGroupId,
          });
          expect(members?.map(({ user_id }) => user_id)).toEqual([member.id]);
          expect(auth0Spy).not.toHaveBeenCalled();
        }
      );

      it('should not re-invite an expired organization member when the TRIAL_INVITE feature flag is disabled', async () => {
        // Given
        vi.mocked(isFeatureEnabled).mockReturnValue(false);
        const { user: member } = await TestHelper.user.insertInOrganization(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          { status: UserAccountStatus.Expired }
        );
        const { bundle } = await createBundleWithGroups();
        const hubspotInviteSpy = vi
          .spyOn(Hubspot, 'hubspotInviteUserHook')
          .mockResolvedValue(undefined);

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [member.id], roles: xtmoneUserRoles }
        );

        // Then
        expect(hubspotInviteSpy).not.toHaveBeenCalled();
        expect((await TestHelper.user.load({ id: member.id })).status).toBe(
          UserAccountStatus.Expired
        );
      });

      it('should not re-invite a member whose expired status changed meanwhile and sync their trial access in Auth0', async () => {
        // Given
        const { user: expiredMember } =
          await TestHelper.user.insertInOrganization(
            TEST_ORGANIZATIONS.FILIGRAN.ID,
            { status: UserAccountStatus.Expired }
          );
        await TestHelper.user.update(
          { id: expiredMember.id },
          { status: null }
        );
        vi.spyOn(UserDomain, 'loadUsers').mockResolvedValueOnce([
          expiredMember,
        ]);
        const { bundle } = await createBundleWithGroups();
        const auth0Spy = vi
          .spyOn(auth0ClientMock, 'updateUserRBACInstance')
          .mockResolvedValue(undefined);
        const hubspotInviteSpy = vi
          .spyOn(Hubspot, 'hubspotInviteUserHook')
          .mockResolvedValue(undefined);

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [expiredMember.id], roles: xtmoneUserRoles }
        );

        // Then
        expect(hubspotInviteSpy).not.toHaveBeenCalled();
        expect(
          (await TestHelper.user.load({ id: expiredMember.id })).status
        ).toBeNull();
        expect(auth0Spy).toHaveBeenCalledWith(
          expiredMember.email,
          expect.anything(),
          undefined
        );
      });

      it('should keep the member capabilities when the email belongs to an organization member', async () => {
        // Given
        const { user: member, userOrganization } =
          await TestHelper.user.insertInOrganization(
            TEST_ORGANIZATIONS.FILIGRAN.ID
          );
        await TestHelper.user_OrganizationCapability.create({
          user_organization_id: userOrganization.id,
          name: OrganizationCapability.ManageAccess,
        });
        const { bundle, groups } = await createBundleWithGroups();
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [],
            emails: [member.email],
            roles: xtmoneUserRoles,
          }
        );

        // Then
        const capabilities =
          await TestHelper.user_OrganizationCapability.loadAll({
            user_organization_id: userOrganization.id,
          });
        expect(capabilities.map(({ name }) => name)).toEqual([
          OrganizationCapability.ManageAccess,
        ]);
        const members = await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        });
        expect(members?.map(({ user_id }) => user_id)).toEqual([member.id]);
        expect(sendMailSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({ template: 'new_user_organization' })
        );
      });

      it('should throw EmailOutsideOrganizationError before adding any user or sending any email when one email is outside the organization domains', async () => {
        // Given
        const { bundle, groups } = await createBundleWithGroups();
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);
        const hubspotInviteSpy = vi
          .spyOn(Hubspot, 'hubspotInviteUserHook')
          .mockResolvedValue(undefined);
        const newEmail = `new-${uuidv4()}@filigran.io`;

        // When
        const call = ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
            emails: [newEmail, `someone-${uuidv4()}@second-orga.com`],
            roles: xtmoneUserRoles,
          }
        );

        // Then
        await expect(call).rejects.toThrow(
          ErrorCode.EmailOutsideOrganizationError
        );
        expect(await TestHelper.user.loadAll({ email: newEmail })).toEqual([]);
        expect(
          await TestHelper.serviceGroupUser.load({
            group_id: groups.xtmoneUserGroupId,
          })
        ).toEqual([]);
        expect(sendMailSpy).not.toHaveBeenCalled();
        expect(hubspotInviteSpy).not.toHaveBeenCalled();
      });

      it('should throw TooManyEmails before adding any user or sending any email when more than 50 emails are given', async () => {
        // Given
        const { bundle, groups } = await createBundleWithGroups();
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);
        const emails = Array.from(
          { length: 51 },
          () => `new-${uuidv4()}@filigran.io`
        );

        // When
        const call = ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID],
            emails,
            roles: xtmoneUserRoles,
          }
        );

        // Then
        await expect(call).rejects.toThrow(ErrorCode.TooManyEmails);
        expect(await TestHelper.user.loadAll({ email: emails[0] })).toEqual([]);
        expect(
          await TestHelper.serviceGroupUser.load({
            group_id: groups.xtmoneUserGroupId,
          })
        ).toEqual([]);
        expect(sendMailSpy).not.toHaveBeenCalled();
      });

      it.each([
        {
          caller: 'an organization administrator',
          context: requestContextSimpleUserFiligran2,
        },
        { caller: 'a bypass user', context: requestContextAdminUser },
      ])(
        'should throw InvalidEmail before adding any user or sending any email when an email has an invalid format and the caller is $caller',
        async ({ context }) => {
          // Given
          requestContext.set(context);
          const { bundle } = await createBundleWithGroups();
          const sendMailSpy = vi
            .spyOn(mailService, 'sendMail')
            .mockResolvedValue(undefined);
          const newEmail = `new-${uuidv4()}@filigran.io`;

          // When
          const call = ServiceGroupApp.addUsersToBundleGroups(
            bundle.service_instance_id,
            {
              userIds: [],
              emails: [newEmail, 'not-an-email'],
              roles: xtmoneUserRoles,
            }
          );

          // Then
          await expect(call).rejects.toThrow(ErrorCode.InvalidEmail);
          expect(await TestHelper.user.loadAll({ email: newEmail })).toEqual(
            []
          );
          expect(sendMailSpy).not.toHaveBeenCalled();
        }
      );

      it('should add the email when it is outside the organization domains and the caller is a bypass user', async () => {
        // Given
        requestContext.set(requestContextAdminUser);
        const { bundle } = await createBundleWithGroups();
        vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
        const email = `someone-${uuidv4()}@second-orga.com`;

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [], emails: [email], roles: xtmoneUserRoles }
        );

        // Then
        expect(await TestHelper.user.loadAll({ email })).toHaveLength(1);
      });

      const setCallerWithCapabilities = async (
        capabilities: OrganizationCapability[]
      ) => {
        const { user: caller, userOrganization } =
          await TestHelper.user.insertInOrganization(
            TEST_ORGANIZATIONS.FILIGRAN.ID
          );
        for (const capability of capabilities) {
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: userOrganization.id,
            name: capability,
          });
        }
        requestContext.set({
          ...requestContextSimpleUserFiligran2,
          user: {
            ...requestContextSimpleUserFiligran2.user,
            id: caller.id,
            email: caller.email,
            selected_org_capabilities: capabilities,
          },
        });
      };

      it('should throw MissingCapabilityOnOrganization when the caller can manage the trial but not the organization users', async () => {
        // Given
        await setCallerWithCapabilities([
          OrganizationCapability.ManagePlatformRegistration,
        ]);
        const { bundle } = await createBundleWithGroups();

        // When
        const call = ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [],
            emails: [`new-${uuidv4()}@filigran.io`],
            roles: xtmoneUserRoles,
          }
        );

        // Then
        await expect(call).rejects.toThrow(
          ErrorCode.MissingCapabilityOnOrganization
        );
      });

      it('should add the new email when the caller can manage both the trial and the organization users', async () => {
        // Given
        await setCallerWithCapabilities([
          OrganizationCapability.ManagePlatformRegistration,
          OrganizationCapability.ManageAccess,
        ]);
        const { bundle, groups } = await createBundleWithGroups();
        vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
        vi.spyOn(Hubspot, 'hubspotInviteUserHook').mockResolvedValue(undefined);
        const email = `new-${uuidv4()}@filigran.io`;

        // When
        await ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [], emails: [email], roles: xtmoneUserRoles }
        );

        // Then
        const [createdUser] = await TestHelper.user.loadAll({ email });
        const members = await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        });
        expect(members?.map(({ user_id }) => user_id)).toEqual([
          createdUser!.id,
        ]);
      });

      it('should throw UserDisabled before adding any user or sending any email when an email belongs to a disabled user outside the organization', async () => {
        // Given
        const disabledUser = await TestHelper.user.insert({
          email: `disabled-${uuidv4()}@filigran.io`,
          disabled: true,
        });
        const { bundle } = await createBundleWithGroups();
        const sendMailSpy = vi
          .spyOn(mailService, 'sendMail')
          .mockResolvedValue(undefined);
        const newEmail = `new-${uuidv4()}@filigran.io`;

        // When
        const call = ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          {
            userIds: [],
            emails: [newEmail, disabledUser.email],
            roles: xtmoneUserRoles,
          }
        );

        // Then
        await expect(call).rejects.toThrow(ErrorCode.UserDisabled);
        expect(await TestHelper.user.loadAll({ email: newEmail })).toEqual([]);
        expect(sendMailSpy).not.toHaveBeenCalled();
      });

      it('should throw UserDisabled when the email belongs to a disabled organization member', async () => {
        // Given
        const { user: member } = await TestHelper.user.insertInOrganization(
          TEST_ORGANIZATIONS.FILIGRAN.ID,
          { disabled: true }
        );
        const { bundle } = await createBundleWithGroups();

        // When
        const call = ServiceGroupApp.addUsersToBundleGroups(
          bundle.service_instance_id,
          { userIds: [], emails: [member.email], roles: xtmoneUserRoles }
        );

        // Then
        await expect(call).rejects.toThrow(ErrorCode.UserDisabled);
      });
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

    it('should not sync Auth0 when removing a user who has no Auth0 account yet', async () => {
      // Given
      const { user: member } = await TestHelper.user.insertInOrganization(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        {
          status: UserAccountStatus.Waiting,
        }
      );
      const { bundle, groups } = await createBundleWithMember({
        userId: member.id,
      });
      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [member.id]
      );

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
      expect(
        await TestHelper.serviceGroupUser.load({
          group_id: groups.xtmoneUserGroupId,
        })
      ).toEqual([]);
    });

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
      expect(auth0Spy).toHaveBeenCalledWith(
        targetUser.EMAIL,
        {
          [openctiChild.platform_id as string]: { groups: [] },
          [xtmoneChild.platform_id as string]: { groups: [] },
        },
        undefined
      );
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

    it('should send a trial_access_removed telemetry event per bundle product for the removed user', async () => {
      // Given
      const actingUser = requestContextSimpleUserFiligran2.user;
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
      const { bundle, openctiChild, xtmoneChild } =
        await createBundleWithMember({ userId: targetUser.ID });

      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [targetUser.ID]
      );

      // Then
      expect(telemetrySpy).toHaveBeenCalledTimes(2);
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_REMOVED,
          user_id: actingUser.id,
          deployment_id: openctiChild.id,
          email: targetUser.EMAIL,
        })
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_REMOVED,
          user_id: actingUser.id,
          deployment_id: xtmoneChild.id,
          email: targetUser.EMAIL,
        })
      );
    });

    it('should only send trial_access_removed telemetry for products the user actually had a role on', async () => {
      // Given
      const actingUser = requestContextSimpleUserFiligran2.user;
      const targetUser = TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS;
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
      const [openctiChild] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: targetUser.ID,
        group_id: openctiAdminGroupId,
      });

      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      await ServiceGroupApp.removeUsersFromBundleGroups(
        bundle.service_instance_id,
        [targetUser.ID]
      );

      // Then
      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_REMOVED,
          user_id: actingUser.id,
          deployment_id: openctiChild!.id,
          email: targetUser.EMAIL,
        })
      );
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

    it('should not sync Auth0 when updating the roles of a user who has no Auth0 account yet', async () => {
      // Given
      const { bundle, groups } = await createBundleWithMembers();
      const { user: member } = await TestHelper.user.insertInOrganization(
        TEST_ORGANIZATIONS.FILIGRAN.ID,
        {
          status: UserAccountStatus.Expired,
        }
      );
      await TestHelper.serviceGroupUser.create({
        user_id: member.id,
        group_id: groups.xtmoneUserGroupId,
      });
      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [member.id],
        roles: [
          { product: PlatformIdentifier.Opencti, role: ServiceGroupName.Admin },
        ],
      });

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
      const openctiAdminMembers = await TestHelper.serviceGroupUser.load({
        group_id: groups.openctiAdminGroupId,
      });
      expect(openctiAdminMembers?.map(({ user_id }) => user_id)).toContain(
        member.id
      );
    });

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
      expect(auth0Spy).toHaveBeenCalledWith(
        targetUser.EMAIL,
        {
          [openctiChild.platform_id as string]: { groups: [] },
          [xtmoneChild.platform_id as string]: { groups: ['Admin'] },
        },
        undefined
      );
    });

    it('should send trial_access_removed when a product role is revoked and trial_access_granted when it changes', async () => {
      // Given
      const actingUser = requestContextSimpleUserFiligran2.user;
      const { bundle, openctiChild, xtmoneChild, targetUser } =
        await createBundleWithMembers();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          { product: PlatformIdentifier.Opencti, role: null },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.Admin },
        ],
      });

      // Then
      expect(telemetrySpy).toHaveBeenCalledTimes(2);
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_REMOVED,
          user_id: actingUser.id,
          deployment_id: openctiChild.id,
          email: targetUser.EMAIL,
        })
      );
      expect(telemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: TelemetryEventType.TRIAL_ACCESS_GRANTED,
          user_id: actingUser.id,
          deployment_id: xtmoneChild.id,
          role: ServiceGroupName.Admin,
          email: targetUser.EMAIL,
        })
      );
    });

    it('should not send any telemetry when re-submitting the roles a user already holds', async () => {
      // Given: targetUser already has opencti=Admin and xtmone=User
      const { bundle, targetUser } = await createBundleWithMembers();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );

      // When
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [
          {
            product: PlatformIdentifier.Opencti,
            role: ServiceGroupName.Admin,
          },
          { product: PlatformIdentifier.Xtmone, role: ServiceGroupName.User },
        ],
      });

      // Then: nothing actually changed, so no grant/removal telemetry fires
      expect(telemetrySpy).not.toHaveBeenCalled();
    });

    it('should not re-send trial_access_removed telemetry for a product the user never had a role on', async () => {
      // Given: targetUser has no role on Opencti's sibling call already
      // revoked once; a second revoke call must not re-emit the event
      const { bundle, targetUser } = await createBundleWithMembers();
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [{ product: PlatformIdentifier.Opencti, role: null }],
      });
      telemetrySpy.mockClear();

      // When: revoking again is a DB no-op
      await ServiceGroupApp.updateBundleUserGroups(bundle.service_instance_id, {
        userIds: [targetUser.ID],
        roles: [{ product: PlatformIdentifier.Opencti, role: null }],
      });

      // Then
      expect(telemetrySpy).not.toHaveBeenCalled();
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

  describe('grantUserAccessAndSetStatus welcome emails', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      vi.restoreAllMocks();
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
    });

    it('should do nothing when the user has no service group grant', async () => {
      // Given
      const auth0Spy = vi.spyOn(auth0ClientMock, 'updateUserRBACInstance');
      const sendMailSpy = vi.spyOn(mailService, 'sendMail');
      const user = await loadUser(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
      );

      // When
      await ServiceGroupApp.grantUserAccessAndSetStatus(user, null, null);

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it('should sync Auth0 groups and send one welcome email per bundle grant', async () => {
      // Given
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const openctiPlatformId = uuidv4();
      const xtmonePlatformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: endDate },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: openctiPlatformId,
            },
            {
              platform_identifier: PlatformIdentifier.Xtmone,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: xtmonePlatformId,
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild, xtmoneChild] = children;
      const openctiGroupId = uuidv4() as ServiceGroupId;
      const xtmoneGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiGroupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: xtmoneGroupId,
        name: 'User',
        service_instance_id: xtmoneChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: openctiGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: xtmoneGroupId,
      });
      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);
      const user = await loadUser(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID);

      // When
      await ServiceGroupApp.grantUserAccessAndSetStatus(user, null, null);

      // Then
      expect(auth0Spy).toHaveBeenCalledTimes(1);
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        {
          [openctiPlatformId]: { groups: ['Admin'] },
          [xtmonePlatformId]: { groups: ['User'] },
        },
        undefined
      );
      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
          template: 'free_trial_bundle_user_added',
          params: expect.objectContaining({
            adminEmail: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL,
            products: expect.arrayContaining([
              PlatformIdentifier.Opencti,
              PlatformIdentifier.Xtmone,
            ]),
          }),
        })
      );
    });

    it('should forward prefetched Auth0 users to the RBAC update', async () => {
      // Given
      const platformId = uuidv4();
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: platformId,
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild] = children;
      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: groupId,
      });
      const auth0Spy = vi
        .spyOn(auth0ClientMock, 'updateUserRBACInstance')
        .mockResolvedValue(undefined);
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
      const prefetched = [{ user_id: 'auth0|1', email: 'a@x.io' }];
      const user = await loadUser(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID);

      // When
      await ServiceGroupApp.grantUserAccessAndSetStatus(
        user,
        null,
        null,
        prefetched
      );

      // Then
      expect(auth0Spy).toHaveBeenCalledWith(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.EMAIL,
        { [platformId]: { groups: ['Admin'] } },
        prefetched
      );
    });

    it('should propagate the Auth0 error and not send the welcome email when the sync fails', async () => {
      // Given
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: endDate },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: uuidv4(),
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild] = children;
      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: groupId,
      });
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockRejectedValue(
        new Error('auth0 is down')
      );
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);
      const user = await loadUser(TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID);

      // When
      const call = ServiceGroupApp.grantUserAccessAndSetStatus(
        user,
        null,
        null
      );

      // Then
      await expect(call).rejects.toThrow('auth0 is down');
      expect(sendMailSpy).not.toHaveBeenCalled();
    });
  });

  describe('grantUserAccessAndSetStatus', () => {
    const createdBundleIds: DeploymentRequestId[] = [];
    const targetUserId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;

    const loadStatus = async () =>
      (await TestHelper.user.load({ id: targetUserId })).status;

    afterEach(async () => {
      vi.restoreAllMocks();
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
      await TestHelper.user.update({ id: targetUserId }, { status: null });
    });

    describe('for a waiting user who has a group', () => {
      beforeEach(async () => {
        await TestHelper.user.update(
          { id: targetUserId },
          {
            status: UserAccountStatus.Waiting,
          }
        );
        const { bundle, children } =
          await TestHelper.deploymentRequest.createBundle({
            bundle: {
              end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            },
            children: [
              {
                platform_identifier: PlatformIdentifier.Opencti,
                hub_status: DeploymentRequestHubStatus.Active,
                platform_id: uuidv4(),
              },
            ],
          });
        createdBundleIds.push(bundle.id);
        const groupId = uuidv4() as ServiceGroupId;
        await TestHelper.serviceGroup.create({
          id: groupId,
          name: 'Admin',
          service_instance_id: children[0]!.service_instance_id,
        });
        await TestHelper.serviceGroupUser.create({
          user_id: targetUserId,
          group_id: groupId,
        });
      });

      it('should send the welcome email and update the status in the same transaction', async () => {
        // Given
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
          undefined
        );
        const inTransactionAtEnqueue: boolean[] = [];
        const sendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockImplementation(async () => {
            inTransactionAtEnqueue.push(databaseContext.isInTransaction());
            return 'job-id';
          });

        const user = await loadUser(targetUserId);

        // When
        await ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          UserAccountStatus.Invited,
          UserAccountStatus.Waiting
        );

        // Then
        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(inTransactionAtEnqueue).toEqual([true]);
        expect(await loadStatus()).toBe(UserAccountStatus.Invited);
      });

      it('should not enqueue the welcome email when the status update fails', async () => {
        // Given
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
          undefined
        );
        const sendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        vi.spyOn(UserDomain, 'updateUser').mockRejectedValue(
          new Error('status write failed')
        );
        const user = await loadUser(targetUserId);

        // When
        const result = ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          null,
          UserAccountStatus.Waiting
        );

        // Then
        await expect(result).rejects.toThrow('status write failed');
        expect(sendSpy).not.toHaveBeenCalled();
        vi.restoreAllMocks();
        expect(await loadStatus()).toBe(UserAccountStatus.Waiting);
      });

      it('should not touch the status nor send mail when the Auth0 sync fails', async () => {
        // Given
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockRejectedValue(
          new Error('auth0 is down')
        );
        const sendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        const updateSpy = vi.spyOn(UserDomain, 'updateUser');

        const user = await loadUser(targetUserId);

        // When
        const result = ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          null,
          UserAccountStatus.Waiting
        );

        // Then
        await expect(result).rejects.toThrow('auth0 is down');
        expect(sendSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(await loadStatus()).toBe(UserAccountStatus.Waiting);
      });

      it('should update the status when it matches the expected one', async () => {
        // Given
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
          undefined
        );
        const sendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');

        const user = await loadUser(targetUserId);

        // When
        await ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          null,
          UserAccountStatus.Waiting
        );

        // Then
        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(await loadStatus()).toBeNull();
      });

      it('should throw and enqueue no mail when the status differs from the expected one', async () => {
        // Given
        await TestHelper.user.update(
          { id: targetUserId },
          {
            status: UserAccountStatus.Invited,
          }
        );
        vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
          undefined
        );
        const sendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        const user = await loadUser(targetUserId);

        // When
        const result = ServiceGroupApp.grantUserAccessAndSetStatus(
          user,
          null,
          UserAccountStatus.Waiting
        );

        // Then
        await expect(result).rejects.toThrow(
          ErrorCode.UserStatusChangedConcurrently
        );
        expect(sendSpy).not.toHaveBeenCalled();
        expect(await loadStatus()).toBe(UserAccountStatus.Invited);
      });
    });

    it('should only update the status when the user has no group to grant', async () => {
      // Given
      await TestHelper.user.update(
        { id: targetUserId },
        {
          status: UserAccountStatus.Waiting,
        }
      );
      const auth0Spy = vi.spyOn(auth0ClientMock, 'updateUserRBACInstance');
      const sendSpy = vi
        .spyOn(PgBossProducer, 'send')
        .mockResolvedValue('job-id');

      const user = await loadUser(targetUserId);

      // When
      await ServiceGroupApp.grantUserAccessAndSetStatus(
        user,
        UserAccountStatus.Invited,
        UserAccountStatus.Waiting
      );

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
      expect(await loadStatus()).toBe(UserAccountStatus.Invited);
    });
  });

  describe('grantAccessIfWaiting', () => {
    const createdBundleIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      vi.restoreAllMocks();
      for (const bundleId of createdBundleIds) {
        await TestHelper.deploymentRequest.deleteBundle(bundleId);
      }
      createdBundleIds.length = 0;
      await UserDomain.updateUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        {
          status: null,
        }
      );
    });

    it('should do nothing when the user status is not waiting', async () => {
      // Given
      const auth0Spy = vi.spyOn(auth0ClientMock, 'updateUserRBACInstance');
      const user = {
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        status: null,
      } as UserLoadUserBy;

      // When
      await ServiceGroupApp.grantAccessIfWaiting(user);

      // Then
      expect(auth0Spy).not.toHaveBeenCalled();
      expect(user.status).toBeNull();
    });

    it('should grant access and clear the status on success', async () => {
      // Given
      await UserDomain.updateUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        {
          status: UserAccountStatus.Waiting,
        }
      );
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: endDate },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: uuidv4(),
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild] = children;
      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: groupId,
      });
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockResolvedValue(
        undefined
      );
      vi.spyOn(mailService, 'sendMail').mockResolvedValue(undefined);
      const user = (await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      })) as UserLoadUserBy;

      // When
      await ServiceGroupApp.grantAccessIfWaiting(user);

      // Then
      expect(user.status).toBeNull();
      const reloadedUser = await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      expect(reloadedUser?.status).toBeNull();
    });

    it('should keep the waiting status when the grant fails, so it can be retried on the next login', async () => {
      // Given
      await UserDomain.updateUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        {
          status: UserAccountStatus.Waiting,
        }
      );
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const { bundle, children } =
        await TestHelper.deploymentRequest.createBundle({
          bundle: { end_date: endDate },
          children: [
            {
              platform_identifier: PlatformIdentifier.Opencti,
              hub_status: DeploymentRequestHubStatus.Active,
              platform_id: uuidv4(),
            },
          ],
        });
      createdBundleIds.push(bundle.id);
      const [openctiChild] = children;
      const groupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: groupId,
        name: 'Admin',
        service_instance_id: openctiChild!.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        group_id: groupId,
      });
      vi.spyOn(auth0ClientMock, 'updateUserRBACInstance').mockRejectedValue(
        new Error('auth0 is down')
      );
      const sendMailSpy = vi
        .spyOn(mailService, 'sendMail')
        .mockResolvedValue(undefined);
      const user = (await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      })) as UserLoadUserBy;

      // When
      await ServiceGroupApp.grantAccessIfWaiting(user);

      // Then
      expect(sendMailSpy).not.toHaveBeenCalled();
      expect(user.status).toBe(UserAccountStatus.Waiting);
      const reloadedUser = await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      expect(reloadedUser?.status).toBe(UserAccountStatus.Waiting);
    });

    it('should log and not throw when the status changed concurrently', async () => {
      // Given
      await UserDomain.updateUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        {
          status: UserAccountStatus.Invited,
        }
      );
      const infoSpy = vi.spyOn(logApp, 'info');
      const errorSpy = vi.spyOn(logApp, 'error');
      const user = {
        id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        status: UserAccountStatus.Waiting,
      } as UserLoadUserBy;

      // When
      await ServiceGroupApp.grantAccessIfWaiting(user);

      // Then
      expect(infoSpy).toHaveBeenCalledWith(
        'User status changed concurrently, login grant skipped',
        { userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID }
      );
      expect(errorSpy).not.toHaveBeenCalledWith(
        'Unable to grant service group access at login',
        expect.anything()
      );
      expect(user.status).toBe(UserAccountStatus.Waiting);
      const reloadedUser = await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
      });
      expect(reloadedUser?.status).toBe(UserAccountStatus.Invited);
    });
  });
});
