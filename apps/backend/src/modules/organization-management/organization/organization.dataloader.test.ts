import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import {
  OrganizationCapability,
  UserAccountStatus,
} from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { UserId } from '../../../model/kanel/public/User';
import { UserDomain } from '../user/user-domain/user.domain';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';
import { OrganizationDataLoader } from './organization.dataloader';

describe('batchLoadAdministratorEmails', () => {
  const loadAdministratorEmails = async (organizationId: OrganizationId) => {
    const administrators =
      await UserDomain.loadUsersByCapabilitiesInOrganization(organizationId, [
        OrganizationCapability.AdministrateOrganization,
      ]);
    return administrators.map(({ email }) => email).sort();
  };

  it('should return the administrator emails of each requested organization, in order, with a single query', async () => {
    // Given
    const unknownOrganizationId = uuidv4() as OrganizationId;
    const batchSpy = vi.spyOn(
      UserDomain,
      'loadUserEmailsByCapabilityInOrganizations'
    );

    // When
    const [secondOrganizationEmails, unknownEmails, filigranEmails] =
      await OrganizationDataLoader.batchLoadAdministratorEmails([
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        unknownOrganizationId,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ]);

    // Then
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(secondOrganizationEmails).toContain(
      TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA.EMAIL
    );
    expect([...secondOrganizationEmails].sort()).toEqual(
      await loadAdministratorEmails(TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID)
    );
    expect([...filigranEmails].sort()).toEqual(
      await loadAdministratorEmails(TEST_ORGANIZATIONS.FILIGRAN.ID)
    );
    expect(unknownEmails).toEqual([]);
  });

  describe('with several administrators', () => {
    const createdUserIds: UserId[] = [];
    let organizationId: OrganizationId;

    afterEach(async () => {
      // Deleting the users cascades to their memberships and capabilities
      for (const id of createdUserIds.splice(0)) {
        await TestHelper.user.delete({ id });
      }
      await TestHelper.organization.delete({ id: organizationId });
    });

    it('should return the administrator emails sorted by email', async () => {
      // Given administrators added out of alphabetical order, next to a plain member
      ({ id: organizationId } = await TestHelper.organization.create());
      const addMember = async (prefix: string, isAdministrator: boolean) => {
        const email = `${prefix}.${uuidv4()}@admin-hub.test`;
        const { user, userOrganization } =
          await TestHelper.user.insertInOrganization(organizationId, {
            email,
          });
        createdUserIds.push(user.id);
        if (isAdministrator) {
          await TestHelper.user_OrganizationCapability.create({
            user_organization_id: userOrganization.id,
            name: OrganizationCapability.AdministrateOrganization,
          });
        }
        return email;
      };
      const charlie = await addMember('charlie', true);
      const alice = await addMember('alice', true);
      await addMember('aaron', false);
      const bob = await addMember('bob', true);

      // When
      const [emails] =
        await OrganizationDataLoader.batchLoadAdministratorEmails([
          organizationId,
        ]);

      // Then
      expect(emails).toEqual([alice, bob, charlie]);
    });
  });

  it('should batch the administrator emails of several organizations loaded in the same tick', async () => {
    // Given
    const batchSpy = vi.spyOn(
      UserDomain,
      'loadUserEmailsByCapabilityInOrganizations'
    );
    const { administratorEmailsByOrganizationIdLoader } =
      OrganizationDataLoader.create();

    // When
    await Promise.all([
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      ),
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.FILIGRAN.ID
      ),
      administratorEmailsByOrganizationIdLoader.load(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      ),
    ]);

    // Then
    expect(batchSpy).toHaveBeenCalledTimes(1);
    expect(batchSpy).toHaveBeenCalledWith(
      [
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ],
      OrganizationCapability.AdministrateOrganization
    );
  });
});

describe('batchLoadMembersCounts', () => {
  const createdUserIds: UserId[] = [];
  const createdOrganizationIds: OrganizationId[] = [];

  const createOrganization = async () => {
    const { id } = await TestHelper.organization.create();
    createdOrganizationIds.push(id);
    return id;
  };

  const addMember = async (
    organizationId: OrganizationId,
    fields: { status?: UserAccountStatus; disabled?: boolean } = {}
  ) => {
    const { user } = await TestHelper.user.insertInOrganization(
      organizationId,
      fields
    );
    createdUserIds.push(user.id);
  };

  afterEach(async () => {
    // Deleting the users cascades to their memberships and pending requests
    for (const id of createdUserIds.splice(0)) {
      await TestHelper.user.delete({ id });
    }
    for (const id of createdOrganizationIds.splice(0)) {
      await TestHelper.organization.delete({ id });
    }
  });

  it('should count every member, invited and disabled ones included, but not the pending requests, and 0 without member', async () => {
    // Given
    const organizationId = await createOrganization();
    const emptyOrganizationId = await createOrganization();
    await addMember(organizationId);
    await addMember(organizationId, { status: UserAccountStatus.Invited });
    await addMember(organizationId, { disabled: true });
    const pendingUser = await TestHelper.user.insertWithPendingOrganization(
      { email: `pending-${uuidv4()}@admin-hub.test` },
      organizationId
    );
    createdUserIds.push(pendingUser.id);

    // When
    const counts = await OrganizationDataLoader.batchLoadMembersCounts([
      organizationId,
      emptyOrganizationId,
    ]);

    // Then
    expect(counts).toEqual([3, 0]);
  });

  it('should count the members of several organizations loaded in the same tick with a single query', async () => {
    // Given
    const firstOrganizationId = await createOrganization();
    const secondOrganizationId = await createOrganization();
    await addMember(firstOrganizationId);
    await addMember(secondOrganizationId);
    await addMember(secondOrganizationId);
    const countSpy = vi.spyOn(
      UserOrganizationDomain,
      'countUsersInOrganizations'
    );
    const { membersCountByOrganizationIdLoader } =
      OrganizationDataLoader.create();

    // When
    const counts = await Promise.all([
      membersCountByOrganizationIdLoader.load(firstOrganizationId),
      membersCountByOrganizationIdLoader.load(secondOrganizationId),
      membersCountByOrganizationIdLoader.load(firstOrganizationId),
    ]);

    // Then
    expect(counts).toEqual([1, 2, 1]);
    expect(countSpy).toHaveBeenCalledTimes(1);
    expect(countSpy).toHaveBeenCalledWith([
      firstOrganizationId,
      secondOrganizationId,
    ]);
  });
});
