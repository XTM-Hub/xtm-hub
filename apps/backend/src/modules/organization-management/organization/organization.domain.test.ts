import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  contextSimpleUserSecondOrga,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { ApiTokenScope } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import CapabilityPortal from '../../../model/kanel/public/CapabilityPortal';
import Organization, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import ServiceInstance from '../../../model/kanel/public/ServiceInstance';
import User, { UserId } from '../../../model/kanel/public/User';
import { UserLoadUserBy } from '../../../model/user';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { narrowUserToToken } from '../../api-token/api-token.auth';
import { OrganizationDomain } from './organization.domain';

// A request-context user member of the given organizations. The restriction reads organization_capabilities only:
// organizations is filled for narrowUserToToken, which filters both
const buildCaller = (
  user: User,
  memberOf: Organization[],
  capabilities: CapabilityPortal[] = []
): UserLoadUserBy => ({
  ...user,
  organizations: memberOf,
  selected_org_capabilities: [],
  roles_portal: [],
  capabilities,
  organization_capabilities: memberOf.map((organization) => ({
    id: `${user.id}-${organization.id}`,
    organization,
    capabilities: [],
  })),
});

describe('organizationsDomain', () => {
  describe('loadOrganizationsByUser', () => {
    it('should return the user organizations when user exists', async () => {
      const organizations = await OrganizationDomain.loadOrganizationsByUser(
        contextSimpleUserSecondOrga.user.id
      );

      expect(organizations).toHaveLength(2);
    });

    it('should return the user organizations when user does not exists', async () => {
      const userId = uuidv4() as UserId;
      const organizations =
        await OrganizationDomain.loadOrganizationsByUser(userId);

      expect(organizations).toHaveLength(0);
    });
  });

  describe('loadUserByOrganization', () => {
    it('should return the user of organization when user exists', async () => {
      const users = await OrganizationDomain.loadUserByOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );

      expect(users).toHaveLength(3);
    });

    it('should return empty user list of organization when user is not in organization', async () => {
      const orgaId = uuidv4() as OrganizationId;
      const users = await OrganizationDomain.loadUserByOrganization(orgaId);

      expect(users).toHaveLength(0);
    });
  });

  describe('loadOrganizationSubscribedToServiceInstance', () => {
    let serviceInstance: ServiceInstance;
    beforeAll(async () => {
      serviceInstance = await TestHelper.serviceInstance.create();
    });

    it('should return null when organization is not subscribed to service instance', async () => {
      const result =
        await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
          serviceInstance.id
        );

      expect(result).toBeFalsy();
    });

    it('should return organization when it is subscribed to service instance', async () => {
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });

      const result =
        await OrganizationDomain.loadOrganizationSubscribedToServiceInstance(
          serviceInstance.id
        );

      expect(result?.id).toBe(TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID);
    });
  });

  describe('loadOrganizationsByIds', () => {
    it('should return organizations matching the given ids', async () => {
      const organizations = await OrganizationDomain.loadOrganizationsByIds([
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        TEST_ORGANIZATIONS.FILIGRAN.ID,
      ]);

      expect(organizations.map((organization) => organization.id)).toEqual(
        expect.arrayContaining([
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          TEST_ORGANIZATIONS.FILIGRAN.ID,
        ])
      );
    });

    it('should return an empty array when no ids match', async () => {
      const organizations = await OrganizationDomain.loadOrganizationsByIds([
        uuidv4() as OrganizationId,
      ]);

      expect(organizations).toEqual([]);
    });

    it('should return an empty array when given no ids', async () => {
      const organizations = await OrganizationDomain.loadOrganizationsByIds([]);

      expect(organizations).toEqual([]);
    });
  });

  describe('loadFirstProfessionalOrganizationBy', () => {
    it('should return a personal space to a BYPASS user', async () => {
      // Given
      requestContext.set({
        ...requestContextSimpleUserSecondOrga,
        user: {
          ...requestContextSimpleUserSecondOrga.user,
          capabilities: [CAPABILITY_BYPASS],
        },
      });
      const id =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA
          .PERSONAL_SPACE_ID;

      // When
      const organization =
        await OrganizationDomain.loadFirstProfessionalOrganizationBy({ id });

      // Then
      expect(organization).toMatchObject({ id, personal_space: true });
    });

    it('should not return the personal space of someone else to a user without BYPASS', async () => {
      // Given
      requestContext.set(requestContextSimpleUserSecondOrga);
      const id =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.ADMIN_ORGA
          .PERSONAL_SPACE_ID;

      // When
      const organization =
        await OrganizationDomain.loadFirstProfessionalOrganizationBy({ id });

      // Then
      expect(organization).toBeUndefined();
    });

    it('should not return their own personal space to a user without BYPASS', async () => {
      // Given
      requestContext.set(requestContextSimpleUserSecondOrga);
      const id =
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.PERSONAL_SPACE_ID;

      // When
      const organization =
        await OrganizationDomain.loadFirstProfessionalOrganizationBy({ id });

      // Then
      expect(organization).toBeUndefined();
    });

    it('should return a standard organization to a user without BYPASS', async () => {
      // Given
      requestContext.set(requestContextSimpleUserSecondOrga);
      const id = TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID;

      // When
      const organization =
        await OrganizationDomain.loadFirstProfessionalOrganizationBy({ id });

      // Then
      expect(organization).toMatchObject({
        id,
        name: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.NAME,
        personal_space: false,
      });
    });

    it('should return undefined for an unknown id', async () => {
      // Given
      requestContext.set(requestContextSimpleUserSecondOrga);
      const id = uuidv4() as OrganizationId;

      // When
      const organization =
        await OrganizationDomain.loadFirstProfessionalOrganizationBy({ id });

      // Then
      expect(organization).toBeUndefined();
    });
  });

  describe('loadOrganizationWhoseMembersAreReadableBy', () => {
    const createdUserIds: UserId[] = [];
    const createdOrganizationIds: OrganizationId[] = [];
    let organizationA: Organization;
    let organizationB: Organization;
    // Member of organization A and of its own personal space, in the database
    let member: User;
    let personalSpace: Organization;

    const createOrganization = async (data?: Partial<Organization>) => {
      const organization = await TestHelper.organization.create(data);
      createdOrganizationIds.push(organization.id);
      return organization;
    };

    beforeEach(async () => {
      organizationA = await createOrganization();
      organizationB = await createOrganization();
      ({ user: member } = await TestHelper.user.insertInOrganization(
        organizationA.id
      ));
      createdUserIds.push(member.id);
      personalSpace = await createOrganization({
        id: member.id as unknown as OrganizationId,
        name: member.email,
        personal_space: true,
      });
      await TestHelper.user_Organization.create({
        user_id: member.id,
        organization_id: personalSpace.id,
      });
    });

    afterEach(async () => {
      // Deleting the users cascades to their memberships
      for (const id of createdUserIds.splice(0)) {
        await TestHelper.user.delete({ id });
      }
      for (const id of createdOrganizationIds.splice(0)) {
        await TestHelper.organization.delete({ id });
      }
    });

    const organizations = () => ({
      organizationA,
      organizationB,
      personalSpace,
    });

    it.each(['organizationA', 'organizationB', 'personalSpace'] as const)(
      'should return %s to a BYPASS user',
      async (key) => {
        // Given
        requestContext.set({
          user: buildCaller(
            member,
            [personalSpace, organizationA],
            [CAPABILITY_BYPASS]
          ),
        });
        const expected = organizations()[key];

        // When
        const organization =
          await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
            id: expected.id,
          });

        // Then
        expect(organization).toMatchObject({
          id: expected.id,
          name: expected.name,
          personal_space: expected.personal_space,
        });
      }
    );

    it.each(['organizationA', 'organizationB'] as const)(
      'should return %s to a user with READ_ORGANIZATION_MEMBERS',
      async (key) => {
        // Given
        requestContext.set({
          user: buildCaller(
            member,
            [personalSpace, organizationA],
            [CAPABILITY_READ_ORGANIZATION_MEMBERS]
          ),
        });
        const expected = organizations()[key];

        // When
        const organization =
          await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
            id: expected.id,
          });

        // Then
        expect(organization).toMatchObject({
          id: expected.id,
          name: expected.name,
          personal_space: false,
        });
      }
    );

    it('should not return their own personal space to a user with READ_ORGANIZATION_MEMBERS', async () => {
      // Given
      requestContext.set({
        user: buildCaller(
          member,
          [personalSpace, organizationA],
          [CAPABILITY_READ_ORGANIZATION_MEMBERS]
        ),
      });

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: personalSpace.id,
        });

      // Then
      expect(organization).toBeUndefined();
    });

    it('should return their organization to a member without portal capability', async () => {
      // Given
      requestContext.set({
        user: buildCaller(member, [personalSpace, organizationA]),
      });

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: organizationA.id,
        });

      // Then
      expect(organization).toMatchObject({
        id: organizationA.id,
        name: organizationA.name,
        personal_space: false,
      });
    });

    it.each(['organizationB', 'personalSpace'] as const)(
      'should not return %s to a member of organization A without portal capability',
      async (key) => {
        // Given
        requestContext.set({
          user: buildCaller(member, [personalSpace, organizationA]),
        });

        // When
        const organization =
          await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
            id: organizations()[key].id,
          });

        // Then
        expect(organization).toBeUndefined();
      }
    );

    it('should not return an organization to a user who belongs to none', async () => {
      // Given
      const loner = await TestHelper.user.insert({
        email: `loner-${uuidv4()}@filigran.io`,
      });
      createdUserIds.push(loner.id);
      requestContext.set({ user: buildCaller(loner, []) });

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: organizationA.id,
        });

      // Then
      expect(organization).toBeUndefined();
    });

    it('should return undefined for an unknown id', async () => {
      // Given
      requestContext.set({
        user: buildCaller(member, [personalSpace, organizationA]),
      });

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: uuidv4() as OrganizationId,
        });

      // Then
      expect(organization).toBeUndefined();
    });

    const setCallerWithApiTokenOnOrganizationA = async () => {
      await TestHelper.user_Organization.create({
        user_id: member.id,
        organization_id: organizationB.id,
      });
      requestContext.set({
        user: narrowUserToToken(
          buildCaller(member, [personalSpace, organizationA, organizationB]),
          { scope: ApiTokenScope.ReadWrite, organization_id: organizationA.id }
        ),
      });
    };

    it('should return the organization of the API token to a member of several organizations', async () => {
      // Given
      await setCallerWithApiTokenOnOrganizationA();

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: organizationA.id,
        });

      // Then
      expect(organization).toMatchObject({
        id: organizationA.id,
        name: organizationA.name,
        personal_space: false,
      });
    });

    it('should not return another organization of the user to an API token restricted to one', async () => {
      // Given
      await setCallerWithApiTokenOnOrganizationA();

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: organizationB.id,
        });

      // Then
      expect(organization).toBeUndefined();
    });

    it('should not return an organization the user was removed from since the session was written', async () => {
      // Given
      requestContext.set({
        user: buildCaller(member, [personalSpace, organizationA]),
      });
      await TestHelper.user_Organization.delete({
        user_id: member.id,
        organization_id: organizationA.id,
      });

      // When
      const organization =
        await OrganizationDomain.loadOrganizationWhoseMembersAreReadableBy({
          id: organizationA.id,
        });

      // Then
      expect(organization).toBeUndefined();
    });
  });
});
