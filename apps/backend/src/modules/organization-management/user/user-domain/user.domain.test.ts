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
import { OrganizationId } from '../../../../model/kanel/public/Organization';
import { ServiceGroupId } from '../../../../model/kanel/public/ServiceGroup';
import User, { UserId, UserMutator } from '../../../../model/kanel/public/User';
import { UserOrganizationCapabilityId } from '../../../../model/kanel/public/UserOrganizationCapability';
import { UserLoadUserBy } from '../../../../model/user';
import { ROLE_ADMIN } from '../../../../portal.const';
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
    // Larger than any organization these tests read: every member fits on one page
    const PAGE_SIZE = 100;
    const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN;
    const SECOND = TEST_ORGANIZATIONS.SECOND_ORGANIZATION;
    const SECOND_MEMBER_IDS: string[] = [
      SECOND.USERS.ADMIN_ORGA.ID,
      SECOND.USERS.REGISTERER.ID,
      SECOND.USERS.SIMPLE.ID,
    ];
    const SECOND_MEMBERS = {
      ids: [...SECOND_MEMBER_IDS].sort(),
      totalCount: SECOND_MEMBER_IDS.length,
    };
    const NO_MEMBER = { ids: [], totalCount: 0 };
    const createdUserIds: UserId[] = [];
    const createdCapabilityIds: UserOrganizationCapabilityId[] = [];

    const addMember = async (
      organizationId: OrganizationId,
      fields: UserMutator = {}
    ) => {
      const { user } = await TestHelper.user.insertInOrganization(
        organizationId,
        fields
      );
      createdUserIds.push(user.id);
      return user;
    };

    // On a seeded membership, so the cleanup deletes the capability row by its id only
    const addCapability = async (
      userId: UserId,
      organizationId: OrganizationId,
      name: OrganizationCapability
    ) => {
      const membership = await TestHelper.user_Organization.load({
        user_id: userId,
        organization_id: organizationId,
      });
      const capability = await TestHelper.user_OrganizationCapability.create({
        user_organization_id: membership.id,
        name,
      });
      createdCapabilityIds.push(capability!.id);
    };

    const setSimpleUserOfSecondCaller = (
      overrides: Partial<UserLoadUserBy> = {}
    ) =>
      requestContext.set({
        ...requestContextSimpleUserSecondOrga,
        user: { ...requestContextSimpleUserSecondOrga.user, ...overrides },
      });

    const countFiligranMembers = async () => {
      const [row] = await UserOrganizationDomain.countUsersInOrganizations([
        FILIGRAN.ID,
      ]);
      return row?.count ?? 0;
    };

    const memberIds = ({ edges }: OrganizationMemberConnection) =>
      edges.map(({ node }) => node.id);

    // Order-free, for the organizations whose members the seed fixes
    const membersOf = (connection: OrganizationMemberConnection) => ({
      ids: memberIds(connection).sort(),
      totalCount: Number(connection.totalCount),
    });

    // For FILIGRAN, whose member count is compared to countUsersInOrganizations
    const sizeOf = ({ edges, totalCount }: OrganizationMemberConnection) => ({
      edges: edges.length,
      totalCount: Number(totalCount),
    });

    afterEach(async () => {
      for (const id of createdCapabilityIds.splice(0)) {
        await TestHelper.user_OrganizationCapability.delete({ id });
      }
      // Deleting the users cascades to their memberships, capabilities, pending requests and API tokens
      for (const id of createdUserIds.splice(0)) {
        await TestHelper.user.delete({ id });
      }
    });

    describe('as a BYPASS user', () => {
      const SEARCH_CASES = [
        {
          field: 'email',
          searchTerm: 'REGISTERER',
          expectedId: SECOND.USERS.REGISTERER.ID,
        },
        {
          field: 'first name',
          searchTerm: SECOND.USERS.REGISTERER.FIRST_NAME.toUpperCase(),
          expectedId: SECOND.USERS.REGISTERER.ID,
        },
        {
          field: 'last name',
          searchTerm: SECOND.USERS.SIMPLE.LAST_NAME.toUpperCase(),
          expectedId: SECOND.USERS.SIMPLE.ID,
        },
      ];
      // Seeded in FILIGRAN: the administrator first, then access-subscription@filigran.io before user15@test.fr
      const ORDERED_SEEDED_FILIGRAN_IDS: string[] = [
        FILIGRAN.USERS.BYPASS.ID,
        FILIGRAN.USERS.SIMPLE2.ID,
        FILIGRAN.USERS.SIMPLE.ID,
      ];
      const COUNTRY = 'Atlantis';
      const PAGINATION_PAGE_SIZE = 2;

      beforeEach(() => {
        requestContext.set(requestContextAdminUser);
      });

      it('should return only the members of the organization when other organizations have members', async () => {
        // Given the seeded SECOND and FILIGRAN members

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(membersOf(connection)).toEqual(SECOND_MEMBERS);
      });

      it('should return invited, expired, waiting and disabled members but not the pending requests when the organization has both', async () => {
        // Given
        const addedMembers = [
          await addMember(SECOND.ID, { status: UserAccountStatus.Invited }),
          await addMember(SECOND.ID, { status: UserAccountStatus.Expired }),
          await addMember(SECOND.ID, { status: UserAccountStatus.Waiting }),
          await addMember(SECOND.ID, { disabled: true }),
        ];
        const pendingUser = await TestHelper.user.insertWithPendingOrganization(
          { email: `pending-${uuidv4()}@admin-hub.test` },
          SECOND.ID
        );
        createdUserIds.push(pendingUser.id);
        const expectedIds = [
          ...SECOND_MEMBER_IDS,
          ...addedMembers.map(({ id }) => id),
        ];

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(membersOf(connection)).toEqual({
          ids: expectedIds.sort(),
          totalCount: expectedIds.length,
        });
      });

      it('should return the capabilities of the membership in this organization only when the member holds others elsewhere', async () => {
        // Given SIMPLE2, ADMINISTRATE_ORGANIZATION in their personal space only

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // Then
        const member = connection.edges.find(
          ({ node }) => node.id === FILIGRAN.USERS.SIMPLE2.ID
        );
        expect([...(member?.node.capabilities ?? [])].sort()).toEqual([
          OrganizationCapability.ManageAccess,
          OrganizationCapability.ManageSubscription,
        ]);
      });

      it('should return an empty capability list when the member holds no capability', async () => {
        // Given the seeded SIMPLE member of SECOND, without capability

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.ID,
          { first: PAGE_SIZE }
        );

        // Then
        const member = connection.edges.find(
          ({ node }) => node.id === SECOND.USERS.SIMPLE.ID
        );
        expect(member?.node).toMatchObject({ capabilities: [] });
      });

      it('should return a capability once when it is stored twice', async () => {
        // Given
        await addCapability(
          SECOND.USERS.REGISTERER.ID,
          SECOND.ID,
          OrganizationCapability.ManagePlatformRegistration
        );

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.ID,
          { first: PAGE_SIZE }
        );

        // Then
        const member = connection.edges.find(
          ({ node }) => node.id === SECOND.USERS.REGISTERER.ID
        );
        expect(member?.node).toMatchObject({
          capabilities: [OrganizationCapability.ManagePlatformRegistration],
        });
      });

      it('should return the administrators first, then the members sorted by email when the organization has both', async () => {
        // Given the seeded FILIGRAN members

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(
          memberIds(connection).filter((id) =>
            ORDERED_SEEDED_FILIGRAN_IDS.includes(id)
          )
        ).toEqual(ORDERED_SEEDED_FILIGRAN_IDS);
      });

      it('should return every member once, in the order of a single page, when paging through the organization', async () => {
        // Given
        const filigranMemberCount = await countFiligranMembers();
        const singlePage = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // When
        const pages: OrganizationMemberConnection[] = [];
        let after: string | null = null;
        do {
          const page: OrganizationMemberConnection =
            await UserDomain.loadOrganizationMemberConnection(FILIGRAN.ID, {
              first: PAGINATION_PAGE_SIZE,
              after,
            });
          pages.push(page);
          after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor! : null;
        } while (after && pages.length <= filigranMemberCount);

        // Then
        expect({
          ids: pages.flatMap(memberIds),
          totalCounts: pages.map(({ totalCount }) => Number(totalCount)),
        }).toEqual({
          ids: memberIds(singlePage),
          totalCounts: pages.map(() => filigranMemberCount),
        });
      });

      it('should return no member but the exact totalCount when the page size is 0', async () => {
        // Given
        const filigranMemberCount = await countFiligranMembers();

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: 0 }
        );

        // Then
        expect(sizeOf(connection)).toEqual({
          edges: 0,
          totalCount: filigranMemberCount,
        });
      });

      it.each(SEARCH_CASES)(
        'should return the member whose $field matches when the search term differs in case',
        async ({ searchTerm, expectedId }) => {
          // Given the seeded SECOND members

          // When
          const connection = await UserDomain.loadOrganizationMemberConnection(
            SECOND.ID,
            { first: PAGE_SIZE, searchTerm }
          );

          // Then
          expect(membersOf(connection)).toEqual({
            ids: [expectedId],
            totalCount: 1,
          });
        }
      );

      it('should return no member when the search term matches the country only', async () => {
        // Given no seeded member has a country
        await addMember(SECOND.ID, { country: COUNTRY });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.ID,
          { first: PAGE_SIZE, searchTerm: COUNTRY.toLowerCase() }
        );

        // Then
        expect(membersOf(connection)).toEqual(NO_MEMBER);
      });
    });

    describe('restricted to the organizations whose members the caller can read', () => {
      it('should return the members of their organization and none of another when the caller has no portal capability', async () => {
        // Given
        setSimpleUserOfSecondCaller();

        // When
        const secondConnection =
          await UserDomain.loadOrganizationMemberConnection(SECOND.ID, {
            first: PAGE_SIZE,
          });
        const filigranConnection =
          await UserDomain.loadOrganizationMemberConnection(FILIGRAN.ID, {
            first: PAGE_SIZE,
          });

        // Then
        expect({
          second: membersOf(secondConnection),
          filigran: membersOf(filigranConnection),
        }).toEqual({ second: SECOND_MEMBERS, filigran: NO_MEMBER });
      });

      it('should not return a member of another organization when they match the search and the caller has no portal capability', async () => {
        // Given
        setSimpleUserOfSecondCaller();

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE, searchTerm: FILIGRAN.USERS.BYPASS.LAST_NAME }
        );

        // Then
        expect(membersOf(connection)).toEqual(NO_MEMBER);
      });

      it('should return the members of the token organization and none of another organization of its user when called with an API token', async () => {
        // Given a created user: deleting them deletes the token in cascade
        const caller = await addMember(FILIGRAN.ID);
        await TestHelper.user_Organization.create({
          user_id: caller.id,
          organization_id: SECOND.ID,
        });
        const filigranMemberCount = await countFiligranMembers();
        await TestHelper.apiToken.actAs(
          caller.id,
          FILIGRAN.ID,
          ApiTokenScope.ReadWrite
        );

        // When
        const filigranConnection =
          await UserDomain.loadOrganizationMemberConnection(FILIGRAN.ID, {
            first: PAGE_SIZE,
          });
        const secondConnection =
          await UserDomain.loadOrganizationMemberConnection(SECOND.ID, {
            first: PAGE_SIZE,
          });

        // Then
        expect({
          filigran: sizeOf(filigranConnection),
          second: membersOf(secondConnection),
        }).toEqual({
          filigran: {
            edges: filigranMemberCount,
            totalCount: filigranMemberCount,
          },
          second: NO_MEMBER,
        });
      });

      it('should not return the members of an organization when the caller was removed from it since the session was written', async () => {
        // Given a session still listing FILIGRAN, which the database no longer does
        const filigran = await TestHelper.organization.load({
          id: FILIGRAN.ID,
        });
        setSimpleUserOfSecondCaller({
          organizations: [
            ...requestContextSimpleUserSecondOrga.user.organizations,
            filigran!,
          ],
        });

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(membersOf(connection)).toEqual(NO_MEMBER);
      });

      it('should return the members of an organization they do not belong to when the caller holds READ_ORGANIZATION_MEMBERS in session', async () => {
        // Given
        setSimpleUserOfSecondCaller({
          capabilities: [CAPABILITY_READ_ORGANIZATION_MEMBERS],
        });
        const filigranMemberCount = await countFiligranMembers();

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(sizeOf(connection)).toEqual({
          edges: filigranMemberCount,
          totalCount: filigranMemberCount,
        });
      });

      it('should not return the member of their own personal space when the owner has no portal capability', async () => {
        // Given
        setSimpleUserOfSecondCaller();

        // When
        const connection = await UserDomain.loadOrganizationMemberConnection(
          SECOND.USERS.SIMPLE.PERSONAL_SPACE_ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(membersOf(connection)).toEqual(NO_MEMBER);
      });

      it('should return the member of a personal space to a BYPASS user but not to a READ_ORGANIZATION_MEMBERS holder when both read it', async () => {
        // Given
        setSimpleUserOfSecondCaller({
          capabilities: [CAPABILITY_READ_ORGANIZATION_MEMBERS],
        });

        // When
        const readerConnection =
          await UserDomain.loadOrganizationMemberConnection(
            SECOND.USERS.SIMPLE.PERSONAL_SPACE_ID,
            { first: PAGE_SIZE }
          );
        requestContext.set(requestContextAdminUser);
        const bypassConnection =
          await UserDomain.loadOrganizationMemberConnection(
            SECOND.USERS.SIMPLE.PERSONAL_SPACE_ID,
            { first: PAGE_SIZE }
          );

        // Then
        expect({
          reader: membersOf(readerConnection),
          bypass: membersOf(bypassConnection),
        }).toEqual({
          reader: NO_MEMBER,
          bypass: { ids: [SECOND.USERS.SIMPLE.ID], totalCount: 1 },
        });
      });
    });
  });
});
