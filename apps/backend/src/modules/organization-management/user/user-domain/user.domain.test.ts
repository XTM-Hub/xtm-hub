import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../../tests/helper/test.helper';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  contextSimpleUserSecondOrga,
  requestContextAdminSecondOrga,
  // eslint-disable-next-line no-restricted-imports
  requestContextAdminUser,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../../tests/tests.const';
import {
  ApiTokenScope,
  OrderingMode,
  OrganizationCapability,
  OrganizationMemberConnection,
  PlatformIdentifier,
  ServiceGroupName,
  UserAccountStatus,
  UserOrdering,
} from '../../../../__generated__/resolvers-types';
import { requestContext } from '../../../../context/request.context';
import { DeploymentRequestId } from '../../../../model/kanel/public/DeploymentRequest';
import Organization, {
  OrganizationId,
} from '../../../../model/kanel/public/Organization';
import { ServiceGroupId } from '../../../../model/kanel/public/ServiceGroup';
import User, { UserId, UserMutator } from '../../../../model/kanel/public/User';
import UserOrganization from '../../../../model/kanel/public/UserOrganization';
import { CAPABILITY_BYPASS, ROLE_ADMIN } from '../../../../portal.const';
import { TelemetryApp } from '../../../telemetry/telemetry.app';
import { TelemetrySource } from '../../../telemetry/telemetry.const';
import { UserOrganizationDomain } from '../user-organization/user-organization.domain';
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

  describe('loadEmailsByIds', () => {
    let insertedUsers: User[] = [];

    afterEach(async () => {
      for (const { id } of insertedUsers) {
        await UserDomain.deleteUserBy({ id });
      }
      insertedUsers = [];
    });

    it('should return the id and the email of the requested users only', async () => {
      // Given two requested users and one other user
      const [first, second, other] = await Promise.all(
        ['first', 'second', 'other'].map((label) =>
          TestHelper.user.insert({
            email: `emails-${label}-${uuidv4()}@filigran.io`,
          })
        )
      );
      insertedUsers.push(first!, second!, other!);

      // When
      const result = await UserDomain.loadEmailsByIds([first!.id, second!.id]);

      // Then
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: first!.id, email: first!.email }),
          expect.objectContaining({ id: second!.id, email: second!.email }),
        ])
      );
      expect(Object.keys(result[0]!)).not.toContain('password');
    });

    it('should return nothing when no id is requested', async () => {
      // Given no requested id

      // When
      const result = await UserDomain.loadEmailsByIds([]);

      // Then
      expect(result).toEqual([]);
    });
  });

  describe('loadUsersToSyncAccountStatus', () => {
    let insertedUsers: User[] = [];

    const insertUser = async (
      label: string,
      status: UserAccountStatus | null,
      invitation_date: Date | null
    ) => {
      const user = await TestHelper.user.insert({
        email: `sync-${label}-${uuidv4()}@filigran.io`,
        status,
        invitation_date,
      });
      insertedUsers.push(user);
      return user;
    };

    afterEach(async () => {
      for (const { id } of insertedUsers) {
        await UserDomain.deleteUserBy({ id });
      }
      insertedUsers = [];
    });

    it('should only return waiting and invited users', async () => {
      const date = new Date('1990-01-01');
      const waiting = await insertUser(
        'waiting',
        UserAccountStatus.Waiting,
        date
      );
      const invited = await insertUser(
        'invited',
        UserAccountStatus.Invited,
        date
      );
      const expired = await insertUser(
        'expired',
        UserAccountStatus.Expired,
        date
      );
      const active = await insertUser('active', null, date);

      const users = await UserDomain.loadUsersToSyncAccountStatus(1000);

      const ids = users.map(({ id }) => id);
      expect(ids).toContain(waiting.id);
      expect(ids).toContain(invited.id);
      expect(ids).not.toContain(expired.id);
      expect(ids).not.toContain(active.id);
    });

    it('should not return disabled users', async () => {
      const date = new Date('1990-01-01');
      const disabled = await TestHelper.user.insert({
        email: `sync-disabled-${uuidv4()}@filigran.io`,
        status: UserAccountStatus.Waiting,
        invitation_date: date,
        disabled: true,
      });
      insertedUsers.push(disabled);
      const notDisabled = await TestHelper.user.insert({
        email: `sync-not-disabled-${uuidv4()}@filigran.io`,
        status: UserAccountStatus.Waiting,
        invitation_date: date,
        disabled: false,
      });
      insertedUsers.push(notDisabled);
      const noFlag = await TestHelper.user.insert({
        email: `sync-no-flag-${uuidv4()}@filigran.io`,
        status: UserAccountStatus.Invited,
        invitation_date: date,
        disabled: null,
      });
      insertedUsers.push(noFlag);

      const users = await UserDomain.loadUsersToSyncAccountStatus(1000);

      const ids = users.map(({ id }) => id);
      expect(ids).not.toContain(disabled.id);
      expect(ids).toContain(notDisabled.id);
      expect(ids).toContain(noFlag.id);
    });

    it('should order by oldest invitation first and users without invitation date last', async () => {
      const newer = await insertUser(
        'newer',
        UserAccountStatus.Invited,
        new Date('1990-06-01')
      );
      const noDate = await insertUser(
        'no-date',
        UserAccountStatus.Waiting,
        null
      );
      const older = await insertUser(
        'older',
        UserAccountStatus.Waiting,
        new Date('1990-01-01')
      );
      const mine = [newer.id, noDate.id, older.id];

      const users = await UserDomain.loadUsersToSyncAccountStatus(1000);

      expect(
        users.map(({ id }) => id).filter((id) => mine.includes(id))
      ).toEqual([older.id, newer.id, noDate.id]);
    });

    it('should not return more users than the limit', async () => {
      const older = await insertUser(
        'older',
        UserAccountStatus.Waiting,
        new Date('1980-01-01')
      );
      await insertUser(
        'newer',
        UserAccountStatus.Waiting,
        new Date('1980-06-01')
      );

      const users = await UserDomain.loadUsersToSyncAccountStatus(1);

      expect(users).toHaveLength(1);
      expect(users[0]!.id).toBe(older.id);
    });
  });

  describe('updateUser with an expected condition', () => {
    let insertedUsers: User[] = [];

    const insertUser = async (status: UserAccountStatus | null) => {
      const user = await TestHelper.user.insert({
        email: `status-if-${uuidv4()}@filigran.io`,
        status,
      });
      insertedUsers.push(user);
      return user;
    };

    afterEach(async () => {
      for (const { id } of insertedUsers) {
        await TestHelper.user.delete({ id });
      }
      insertedUsers = [];
    });

    it('should update the status and return the user when the expected status matches', async () => {
      // Given
      const user = await insertUser(UserAccountStatus.Waiting);

      // When
      const updated = await UserDomain.updateUser(
        user.id,
        { status: UserAccountStatus.Invited },
        { status: UserAccountStatus.Waiting }
      );

      // Then
      expect(updated).toMatchObject({
        id: user.id,
        status: UserAccountStatus.Invited,
      });
      expect((await TestHelper.user.load({ id: user.id })).status).toBe(
        UserAccountStatus.Invited
      );
    });

    it('should not update and return undefined when the expected status does not match', async () => {
      // Given
      const user = await insertUser(UserAccountStatus.Invited);

      // When
      const updated = await UserDomain.updateUser(
        user.id,
        { status: null },
        { status: UserAccountStatus.Waiting }
      );

      // Then
      expect(updated).toBeUndefined();
      expect((await TestHelper.user.load({ id: user.id })).status).toBe(
        UserAccountStatus.Invited
      );
    });

    it('should match a null status when null is expected', async () => {
      // Given
      const user = await insertUser(null);

      // When
      const updated = await UserDomain.updateUser(
        user.id,
        { status: UserAccountStatus.Expired },
        { status: null }
      );

      // Then
      expect(updated).toMatchObject({
        id: user.id,
        status: UserAccountStatus.Expired,
      });
    });

    it('should not match a non-null status when null is expected', async () => {
      // Given
      const user = await insertUser(UserAccountStatus.Waiting);

      // When
      const updated = await UserDomain.updateUser(
        user.id,
        { status: UserAccountStatus.Expired },
        { status: null }
      );

      // Then
      expect(updated).toBeUndefined();
      expect((await TestHelper.user.load({ id: user.id })).status).toBe(
        UserAccountStatus.Waiting
      );
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

  describe('loadOrganizationMemberConnection', () => {
    // Larger than any organization these tests create: every member fits on one page
    const PAGE_SIZE = 100;
    const createdUserIds: UserId[] = [];
    const createdOrganizationIds: OrganizationId[] = [];
    let organizationA: Organization;
    let organizationB: Organization;
    // Member of no organization, made BYPASS by the tests that need it
    let bypassUser: User;

    const createOrganization = async (data?: Partial<Organization>) => {
      const organization = await TestHelper.organization.create(data);
      createdOrganizationIds.push(organization.id);
      return organization;
    };

    const addMember = async (
      organization: Organization,
      fields: UserMutator = {},
      capabilities: OrganizationCapability[] = []
    ) => {
      const { user, userOrganization } =
        await TestHelper.user.insertInOrganization(organization.id, fields);
      createdUserIds.push(user.id);
      await grantCapabilities(userOrganization, capabilities);
      return { user, userOrganization };
    };

    const grantCapabilities = async (
      userOrganization: UserOrganization,
      capabilities: OrganizationCapability[]
    ) => {
      for (const name of capabilities) {
        await TestHelper.user_OrganizationCapability.create({
          user_organization_id: userOrganization.id,
          name,
        });
      }
    };

    // The request context of a call with a token of the user on organization A, through the real middlewares
    const actAsTokenOnOrganizationA = (user: User, scope: ApiTokenScope) =>
      TestHelper.apiToken.actAs(user.id, organizationA.id, scope);

    const setBypassCaller = () =>
      requestContext.set({
        user: TestHelper.caller.build(bypassUser, [], [CAPABILITY_BYPASS]),
      });

    const memberIds = ({ edges }: OrganizationMemberConnection) =>
      edges.map(({ node }) => node.id);

    beforeEach(async () => {
      organizationA = await createOrganization();
      organizationB = await createOrganization();
      bypassUser = await TestHelper.user.insert({
        email: `bypass-${uuidv4()}@admin-hub.test`,
      });
      createdUserIds.push(bypassUser.id);
    });

    afterEach(async () => {
      // Deleting the users cascades to their memberships, capabilities and pending requests
      for (const id of createdUserIds.splice(0)) {
        await TestHelper.user.delete({ id });
      }
      for (const id of createdOrganizationIds.splice(0)) {
        await TestHelper.organization.delete({ id });
      }
    });

    describe('as a BYPASS user', () => {
      it('should return the members of the organization only', async () => {
        // Given
        setBypassCaller();
        const { user: firstMember } = await addMember(organizationA);
        const { user: secondMember } = await addMember(organizationA);
        await addMember(organizationB);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(memberIds(connection).sort()).toEqual(
          [firstMember.id, secondMember.id].sort()
        );
        expect(Number(connection.totalCount)).toBe(2);
      });

      it('should return invited, expired, waiting and disabled members but not the pending requests', async () => {
        // Given
        setBypassCaller();
        const members = await Promise.all([
          addMember(organizationA),
          addMember(organizationA, { status: UserAccountStatus.Invited }),
          addMember(organizationA, { status: UserAccountStatus.Expired }),
          addMember(organizationA, { status: UserAccountStatus.Waiting }),
          addMember(organizationA, { disabled: true }),
        ]);
        const pendingUser = await TestHelper.user.insertWithPendingOrganization(
          { email: `pending-${uuidv4()}@admin-hub.test` },
          organizationA.id
        );
        createdUserIds.push(pendingUser.id);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        const membersCounts =
          await UserOrganizationDomain.countUsersInOrganizations([
            organizationA.id,
          ]);
        expect(memberIds(connection).sort()).toEqual(
          members.map(({ user }) => user.id).sort()
        );
        // A missing row fails here, showing the rows received
        expect(membersCounts).toEqual([
          { organization_id: organizationA.id, count: 5 },
        ]);
        expect(Number(connection.totalCount)).toBe(membersCounts[0]?.count);
      });

      it('should return the capabilities of the membership in this organization only', async () => {
        // Given
        setBypassCaller();
        const { user } = await addMember(organizationA, {}, [
          OrganizationCapability.ManageAccess,
        ]);
        const membershipB = await TestHelper.user_Organization.create({
          user_id: user.id,
          organization_id: organizationB.id,
        });
        await grantCapabilities(membershipB!, [
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManageSubscription,
        ]);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(connection.edges).toHaveLength(1);
        expect(connection.edges[0]!.node).toMatchObject({
          id: user.id,
          capabilities: [OrganizationCapability.ManageAccess],
        });
      });

      it('should return an empty capability list to a member without capability', async () => {
        // Given
        setBypassCaller();
        const { user } = await addMember(organizationA);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(connection.edges).toHaveLength(1);
        expect(connection.edges[0]!.node).toMatchObject({ id: user.id });
        expect(connection.edges[0]!.node.capabilities).toEqual([]);
      });

      it('should return a capability stored twice once', async () => {
        // Given
        setBypassCaller();
        await addMember(organizationA, {}, [
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManageSubscription,
        ]);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect([...connection.edges[0]!.node.capabilities].sort()).toEqual([
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManageSubscription,
        ]);
      });

      it('should count each member once when members hold several capabilities', async () => {
        // Given
        setBypassCaller();
        await addMember(organizationA, {}, [
          OrganizationCapability.AdministrateOrganization,
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManageSubscription,
        ]);
        await addMember(organizationA, {}, [
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManagePlatformRegistration,
        ]);
        await addMember(organizationA);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(connection.edges).toHaveLength(3);
        expect(Number(connection.totalCount)).toBe(3);
      });

      it('should return the administrators first, then the members sorted by email', async () => {
        // Given members added out of order, one without any capability
        setBypassCaller();
        const add = async (
          prefix: string,
          capabilities: OrganizationCapability[]
        ) => {
          const { user } = await addMember(
            organizationA,
            { email: `${prefix}.${uuidv4()}@admin-hub.test` },
            capabilities
          );
          return user.id;
        };
        const zed = await add('zed', [
          OrganizationCapability.AdministrateOrganization,
        ]);
        const amy = await add('amy', []);
        const carl = await add('carl', [OrganizationCapability.ManageAccess]);
        const bob = await add('bob', [
          OrganizationCapability.ManageAccess,
          OrganizationCapability.AdministrateOrganization,
        ]);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(memberIds(connection)).toEqual([bob, zed, amy, carl]);
      });

      it('should page through every member once, in the order of a single page', async () => {
        // Given
        setBypassCaller();
        for (let index = 0; index < 5; index++) {
          await addMember(
            organizationA,
            {},
            index % 2 === 0
              ? [OrganizationCapability.AdministrateOrganization]
              : []
          );
        }
        const singlePage = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // When
        const pages: OrganizationMemberConnection[] = [];
        let after: string | null = null;
        do {
          const page: OrganizationMemberConnection =
            await UserDomain.loadOrganizationMemberConnection(
              organizationA.id,
              { first: 2, after }
            );
          pages.push(page);
          after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor! : null;
        } while (after && pages.length < 10);

        // Then
        const pagedIds = pages.flatMap(memberIds);
        expect(pages.map(({ edges }) => edges.length)).toEqual([2, 2, 1]);
        expect(pages.map(({ totalCount }) => Number(totalCount))).toEqual([
          5, 5, 5,
        ]);
        expect(new Set(pagedIds).size).toBe(5);
        expect(pagedIds).toEqual(memberIds(singlePage));
      });

      it('should return no member but the exact totalCount for a page of 0', async () => {
        // Given
        setBypassCaller();
        await addMember(organizationA);
        await addMember(organizationA);

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: 0 }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(2);
      });

      it('should search the email, the first name and the last name, ignoring case', async () => {
        // Given
        setBypassCaller();
        const { user: byEmail } = await addMember(organizationA, {
          email: `NEEDLE-${uuidv4()}@admin-hub.test`,
        });
        const { user: byFirstName } = await addMember(organizationA, {
          first_name: 'NeEdLe',
        });
        const { user: byLastName } = await addMember(organizationA, {
          last_name: 'Needleman',
        });
        await addMember(organizationA, {
          first_name: 'Hay',
          last_name: 'Stack',
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE, searchTerm: 'needle' }
        );

        // Then
        expect(memberIds(connection).sort()).toEqual(
          [byEmail.id, byFirstName.id, byLastName.id].sort()
        );
        expect(Number(connection.totalCount)).toBe(3);
      });

      it('should not search the country', async () => {
        // Given
        setBypassCaller();
        await addMember(organizationA, { country: 'Atlantis' });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE, searchTerm: 'atlantis' }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(0);
      });

      it('should not return a member of another organization matching the search', async () => {
        // Given
        setBypassCaller();
        await addMember(organizationA, { last_name: 'Smith' });
        await addMember(organizationB, { last_name: 'Haystack' });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE, searchTerm: 'haystack' }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(0);
      });
    });

    describe('restricted to the organizations whose members the caller can read', () => {
      it('should return the members of their organization to a member without portal capability, and none of another', async () => {
        // Given
        const { user: caller } = await addMember(organizationA);
        const { user: colleague } = await addMember(organizationA);
        await addMember(organizationB);
        requestContext.set({
          user: TestHelper.caller.build(caller, [organizationA]),
        });

        // When
        const connectionA = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );
        const connectionB = await UserDomain.loadOrganizationMemberConnection(
          organizationB.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(memberIds(connectionA).sort()).toEqual(
          [caller.id, colleague.id].sort()
        );
        expect(connectionB.edges).toEqual([]);
        expect(Number(connectionB.totalCount)).toBe(0);
      });

      it('should not return a member of another organization matching the search to a member without portal capability', async () => {
        // Given
        const { user: caller } = await addMember(organizationA);
        await addMember(organizationB, { last_name: 'Haystack' });
        requestContext.set({
          user: TestHelper.caller.build(caller, [organizationA]),
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationB.id,
          { first: PAGE_SIZE, searchTerm: 'haystack' }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(0);
      });

      it('should return the members of the organization of an API token, and none of another organization of its user', async () => {
        // Given
        const { user: caller } = await addMember(organizationA);
        await TestHelper.user_Organization.create({
          user_id: caller.id,
          organization_id: organizationB.id,
        });
        await addMember(organizationB);
        await actAsTokenOnOrganizationA(caller, ApiTokenScope.ReadWrite);

        // When
        const connectionA = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );
        const connectionB = await UserDomain.loadOrganizationMemberConnection(
          organizationB.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(memberIds(connectionA)).toEqual([caller.id]);
        expect(connectionB.edges).toEqual([]);
        expect(Number(connectionB.totalCount)).toBe(0);
      });

      it('should not return the members of an organization the user was removed from since the session was written', async () => {
        // Given
        const { user: caller } = await addMember(organizationA);
        await addMember(organizationA);
        requestContext.set({
          user: TestHelper.caller.build(caller, [organizationA]),
        });
        await TestHelper.user_Organization.delete({
          user_id: caller.id,
          organization_id: organizationA.id,
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationA.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(0);
      });

      it('should return the members of an organization they do not belong to, to a READ_ORGANIZATION_MEMBERS holder in session', async () => {
        // Given
        const { user: holder } = await addMember(organizationA);
        const { user: memberOfB } = await addMember(organizationB);
        requestContext.set({
          user: TestHelper.caller.build(
            holder,
            [organizationA],
            [CAPABILITY_READ_ORGANIZATION_MEMBERS]
          ),
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          organizationB.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(memberIds(connection)).toEqual([memberOfB.id]);
        expect(Number(connection.totalCount)).toBe(1);
      });

      it('should not return the member of their own personal space to its owner without portal capability', async () => {
        // Given
        const owner = await TestHelper.user.insert({
          email: `owner-${uuidv4()}@admin-hub.test`,
        });
        createdUserIds.push(owner.id);
        const personalSpace = await createOrganization({
          id: owner.id as unknown as OrganizationId,
          name: owner.email,
          personal_space: true,
        });
        await TestHelper.user_Organization.create({
          user_id: owner.id,
          organization_id: personalSpace.id,
        });
        requestContext.set({
          user: TestHelper.caller.build(owner, [personalSpace]),
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          personalSpace.id,
          { first: PAGE_SIZE }
        );

        // Then
        expect(connection.edges).toEqual([]);
        expect(Number(connection.totalCount)).toBe(0);
      });

      it('should not return the member of a personal space to a user with READ_ORGANIZATION_MEMBERS, but to a BYPASS user', async () => {
        // Given
        const owner = await TestHelper.user.insert({
          email: `owner-${uuidv4()}@admin-hub.test`,
        });
        createdUserIds.push(owner.id);
        const personalSpace = await createOrganization({
          id: owner.id as unknown as OrganizationId,
          name: owner.email,
          personal_space: true,
        });
        await TestHelper.user_Organization.create({
          user_id: owner.id,
          organization_id: personalSpace.id,
        });
        requestContext.set({
          user: TestHelper.caller.build(
            owner,
            [personalSpace],
            [CAPABILITY_READ_ORGANIZATION_MEMBERS]
          ),
        });

        // When
        const readerConnection =
          await UserDomain.loadOrganizationMemberConnection(personalSpace.id, {
            first: PAGE_SIZE,
          });
        setBypassCaller();
        const bypassConnection =
          await UserDomain.loadOrganizationMemberConnection(personalSpace.id, {
            first: PAGE_SIZE,
          });

        // Then
        expect(readerConnection.edges).toEqual([]);
        expect(Number(readerConnection.totalCount)).toBe(0);
        expect(memberIds(bypassConnection)).toEqual([owner.id]);
      });
    });
  });
});
