import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import {
  OrderingMode,
  PlatformIdentifier,
  ServiceGroupName,
  UserAccountStatus,
  UserOrdering,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { DeploymentRequestId } from '../../../../model/kanel/public/DeploymentRequest';
import { ServiceGroupId } from '../../../../model/kanel/public/ServiceGroup';
import User, { UserId } from '../../../../model/kanel/public/User';
import { ROLE_ADMIN } from '../../../../portal.const';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetrySource } from '../../../telemetry/telemetry.const';
import { UserDomain } from './user.domain';

//Issue with test
describe('users domain', () => {
  afterEach(async () => {
    vi.useRealTimers();
  });

  describe('insertUser', () => {
    let insertedUser: User | undefined;

    afterEach(async () => {
      if (insertedUser) {
        await UserDomain.deleteUserBy({ id: insertedUser.id });
        insertedUser = undefined;
      }
    });

    it('should insert a user and return it', async () => {
      const userId = uuidv4() as UserId;
      insertedUser = await UserDomain.insertUser({
        id: userId,
        email: 'insert-user-domain-test@filigran.io',
        salt: 'test-salt',
        password: 'test-password',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        first_name: 'Insert',
        last_name: 'Test',
        picture: null,
      });

      expect(insertedUser).toMatchObject({
        id: userId,
        email: 'insert-user-domain-test@filigran.io',
        first_name: 'Insert',
        last_name: 'Test',
        selected_organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
      });
    });
  });

  it('should load user Admin', async () => {
    const response = (await UserDomain.loadUserBy({
      'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID as UserId,
    }))!;
    expect(response.email).toEqual(
      TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL
    );
    expect(response.selected_organization_id).toEqual(
      TEST_ORGANIZATIONS.FILIGRAN.ID
    );
    expect(response.organization_capabilities).toHaveLength(2);
  });

  describe('loadUserBy with an Organization.id restriction', () => {
    it('should return the user with all their organizations when they belong to the given organization', async () => {
      const response = await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        'Organization.id': TEST_ORGANIZATIONS.FILIGRAN.ID,
      });

      expect(response?.email).toEqual(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.EMAIL
      );
      expect(response?.organization_capabilities).toHaveLength(2);
    });

    it('should return undefined when the user does not belong to the given organization', async () => {
      const response = await UserDomain.loadUserBy({
        'User.id': TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        'Organization.id': TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      expect(response).toBeUndefined();
    });
  });

  it('should throw FORBIDDEN_ACCESS when Simple User calls EditUser', async () => {
    try {
      requestContext.set(requestContextSimpleUserSecondOrga);
      await UserDomain.updateUser(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID,
        {
          email: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL,
        }
      );
    } catch (error) {
      expect(error.name).toBe('FORBIDDEN_ACCESS');
    }
  });
  it('should send a login event', async () => {
    vi.useFakeTimers();
    const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
    vi.setSystemTime(date);
    const telemetrySpy = vi
      .spyOn(TelemetryApp, 'sendTelemetryEvent')
      .mockResolvedValue();

    await UserDomain.updateUserAtLogin(contextSimpleUserSecondOrga.user);
    expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
      '@timestamp': '2025-02-03T13:12:15.000Z',
      event_type: 'login',
      organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      organization_name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
      organization_type: 'Professional',
      source: TelemetrySource.XTMHUB,
      user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
    });
  });

  describe('updateUserAtLogin', () => {
    let insertedUser: User | undefined;

    afterEach(async () => {
      if (insertedUser) {
        await UserDomain.deleteUserBy({ id: insertedUser.id });
        insertedUser = undefined;
      }
    });

    it.each([UserAccountStatus.Invited, UserAccountStatus.Expired, null])(
      'should clear a status=%s to null on login',
      async (status) => {
        insertedUser = await TestHelper.user.insert({
          email: `login-${status}-${uuidv4()}@filigran.io`,
          status,
        });
        const loadedUser = await UserDomain.loadUserBy({
          'User.id': insertedUser.id,
        });

        const user = await UserDomain.updateUserAtLogin(loadedUser!);

        expect(user.status).toBeNull();
      }
    );

    it('should leave a status=waiting untouched until the service group grant succeeds', async () => {
      insertedUser = await TestHelper.user.insert({
        email: `login-waiting-${uuidv4()}@filigran.io`,
        status: UserAccountStatus.Waiting,
      });
      const loadedUser = await UserDomain.loadUserBy({
        'User.id': insertedUser.id,
      });

      const user = await UserDomain.updateUserAtLogin(loadedUser!);

      expect(user.status).toBe(UserAccountStatus.Waiting);
    });
  });

  describe('loadUserConnection', () => {
    const opts = {
      first: 50,
      orderMode: OrderingMode.Asc,
      orderBy: UserOrdering.Email,
      filters: [],
    };

    it('should only return users from the selected organization for non-platform-admin users', async () => {
      requestContext.set(requestContextAdminSecondOrga);

      const result = await UserDomain.loadUserConnection(opts);

      const returnedIds = result.edges.map((e) => e.node!.id);
      expect(returnedIds).toContain(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
      );
      expect(returnedIds).toContain(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID
      );
      expect(returnedIds).not.toContain(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      );
    });

    it('should return users from all organizations for admin users', async () => {
      requestContext.set({
        ...requestContextAdminUser,
        user: { ...requestContextAdminUser.user, roles_portal: [ROLE_ADMIN] },
      });

      const result = await UserDomain.loadUserConnection(opts);

      const returnedIds = result.edges.map((e) => e.node!.id);
      expect(returnedIds).toContain(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.ID
      );
      expect(returnedIds).toContain(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      );
    });

    describe('ordered by invitation date', () => {
      const SECOND_ORGANIZATION_USERS =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS;
      const FIRST_INVITED_USER_ID = SECOND_ORGANIZATION_USERS.SIMPLE.ID;
      const LAST_INVITED_USER_ID = SECOND_ORGANIZATION_USERS.ADMIN_ORGA.ID;
      const NEVER_INVITED_USER_ID = SECOND_ORGANIZATION_USERS.REGISTERER.ID;

      afterEach(async () => {
        for (const userId of [FIRST_INVITED_USER_ID, LAST_INVITED_USER_ID]) {
          await UserDomain.updateUser(userId, { invitation_date: null });
        }
      });

      it('should list users by invitation date, users never invited last', async () => {
        // Given two users of the organization invited on different days, and one never invited
        requestContext.set(requestContextAdminSecondOrga);
        await UserDomain.updateUser(LAST_INVITED_USER_ID, {
          invitation_date: new Date('2026-01-02T00:00:00.000Z'),
        });
        await UserDomain.updateUser(FIRST_INVITED_USER_ID, {
          invitation_date: new Date('2026-01-01T00:00:00.000Z'),
        });

        // When loading the users ordered by invitation date
        const result = await UserDomain.loadUserConnection({
          ...opts,
          orderBy: UserOrdering.InvitationDate,
        });

        // Then the earliest invitation comes first, ahead of the user never invited
        const returnedIds = result.edges.map((e) => e.node!.id);
        expect(returnedIds).toContain(NEVER_INVITED_USER_ID);
        expect(returnedIds.slice(0, 2)).toEqual([
          FIRST_INVITED_USER_ID,
          LAST_INVITED_USER_ID,
        ]);
      });
    });
  });

  describe('loadUsersWithDeploymentServiceGroups', () => {
    const createdDeploymentRequestIds: DeploymentRequestId[] = [];

    afterEach(async () => {
      for (const deploymentRequestId of createdDeploymentRequestIds) {
        await TestHelper.deploymentRequest.deleteBundle(deploymentRequestId);
      }
      createdDeploymentRequestIds.length = 0;
    });

    it('should return one row per user/platform-group pair for the deployment request children', async () => {
      // Given
      const createdBundle = await TestHelper.deploymentRequest.createBundle({
        children: [
          { platform_identifier: PlatformIdentifier.Opencti },
          { platform_identifier: PlatformIdentifier.Openaev },
        ],
      });
      const { bundle, children } = createdBundle;
      createdDeploymentRequestIds.push(bundle.id);
      const [openctiDeploymentRequest, openaevDeploymentRequest] = children;

      const openctiAdminGroupId = uuidv4() as ServiceGroupId;
      const openaevObserverGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: openctiAdminGroupId,
        name: ServiceGroupName.Admin,
        service_instance_id: openctiDeploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroup.create({
        id: openaevObserverGroupId,
        name: ServiceGroupName.Observer,
        service_instance_id: openaevDeploymentRequest.service_instance_id,
      });

      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        group_id: openctiAdminGroupId,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        group_id: openaevObserverGroupId,
      });

      // When
      const rows = await UserDomain.loadUsersWithDeploymentServiceGroups(
        bundle.id
      );

      // Then
      expect(rows).toHaveLength(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
            platform_identifier: PlatformIdentifier.Opencti,
            group_name: ServiceGroupName.Admin,
          }),
          expect.objectContaining({
            id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
            platform_identifier: PlatformIdentifier.Openaev,
            group_name: ServiceGroupName.Observer,
          }),
        ])
      );
    });

    it('should not return groups from deployment requests that are not children of the given parent', async () => {
      // Given
      const createdBundle = await TestHelper.deploymentRequest.createBundle();
      const { bundle } = createdBundle;
      createdDeploymentRequestIds.push(bundle.id);

      const unrelatedDeploymentRequest =
        await TestHelper.deploymentRequest.createWithServiceInstanceAndSubscription(
          { parent_id: null, platform_identifier: PlatformIdentifier.Opencti }
        );
      createdDeploymentRequestIds.push(unrelatedDeploymentRequest.id);

      const unrelatedGroupId = uuidv4() as ServiceGroupId;
      await TestHelper.serviceGroup.create({
        id: unrelatedGroupId,
        name: ServiceGroupName.Admin,
        service_instance_id: unrelatedDeploymentRequest.service_instance_id,
      });
      await TestHelper.serviceGroupUser.create({
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        group_id: unrelatedGroupId,
      });

      // When
      const rows = await UserDomain.loadUsersWithDeploymentServiceGroups(
        bundle.id
      );

      // Then
      expect(rows).toEqual([]);
    });
  });
});
