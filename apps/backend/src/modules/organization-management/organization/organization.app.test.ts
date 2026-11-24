import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { OrganizationMemberConnection } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import User, { UserId } from '../../../model/kanel/public/User';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { securityGuard } from '../../../security/guard';
import { ErrorCode } from '../../../utils/error/error.code';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetrySource } from '../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { UserDomain } from '../user/user-domain/user.domain';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user/user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../user/user.helper';
import { OrganizationApp } from './organization.app';
import { OrganizationDomain } from './organization.domain';
import { OrganizationHelper } from './organization.helper';

describe('organizationApp', () => {
  afterEach(async () => {
    vi.useRealTimers();
  });
  describe('updateOrganization', () => {
    it('should send a telemetry event', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await OrganizationApp.updateOrganization(
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        {
          domains: [
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME,
            TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.SECOND.NAME,
          ],
          name: 'new OrgaName',
        }
      );

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.UPDATE_ORGANIZATION,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        organization_name: 'new OrgaName',
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        domains: [
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.FIRST.NAME,
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.DOMAINS.SECOND.NAME,
        ],
      });
    });
  });

  describe('createOrganization', () => {
    it('should send a telemetry event', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await OrganizationApp.createOrganization({
        domains: ['test.com', 'test.fr'],
        name: 'test.com',
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.CREATE_ORGANIZATION,
        organization_id: expect.any(String),
        organization_name: 'test.com',
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID,
        domains: ['test.com', 'test.fr'],
      });
    });

    it('should throw if an organization with the same domain exists', async () => {
      await TestHelper.organization.create({
        name: 'domain1.io',
        domains: ['domain1.io', 'domain2.io'],
      });

      const call = OrganizationApp.createOrganization({
        domains: ['domain1.io'],
        name: 'otherDomain.io',
      });

      await expect(call).rejects.toThrow(
        ErrorCode.OrganizationSameDomainExists
      );
    });

    it('should throw if an organization with the same name exists', async () => {
      await TestHelper.organization.create({
        name: 'alreadyExistingOrga',
        domains: ['alreadyExistingOrga.io'],
      });

      const call = OrganizationApp.createOrganization({
        domains: ['whatever.io'],
        name: 'alreadyExistingOrga',
      });

      await expect(call).rejects.toThrow(ErrorCode.OrganizationSameNameExists);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete the organization', async () => {
      const { id: organizationId } = await TestHelper.organization.create({
        name: 'newOrganization',
        domains: ['orga.com'],
      });

      const newOrganization = await TestHelper.organization.load({
        id: organizationId,
      });
      expect(newOrganization).toBeDefined();

      await OrganizationApp.deleteOrganization(organizationId);

      const deletedOrganization = await TestHelper.organization.load({
        id: organizationId,
      });
      expect(deletedOrganization).toBeUndefined();
    });

    it('should delete an organization that has a single linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'singleUserOrganization',
      });
      const user = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: user.id,
        organizations_id: [organization.id],
      });

      await OrganizationApp.deleteOrganization(organization.id);

      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeUndefined();
    });

    it('should throw when the organization does not exist', async () => {
      const call = OrganizationApp.deleteOrganization(
        uuidv4() as OrganizationId
      );

      await expect(call).rejects.toThrow(ErrorCode.OrganizationNotFound);
    });

    it('should throw when the organization has more than one linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'multiUserOrganization',
      });
      const firstUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const secondUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: firstUser.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: secondUser.id,
        organizations_id: [organization.id],
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationRequiresSingleUser
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();
    });

    it('should throw when the organization has pending users even with a single linked user', async () => {
      const organization = await TestHelper.organization.create({
        name: 'pendingUserOrganization',
      });
      const linkedUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const pendingUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: linkedUser.id,
        organizations_id: [organization.id],
      });
      await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
        user_id: pendingUser.id,
        organization_id: organization.id,
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationPendingUsers
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();
    });

    it('should throw when the organization has connected products', async () => {
      const organization = await TestHelper.organization.create({
        name: 'connectedProductOrganization',
      });
      const linkedUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationDomain.createUserOrganizationRelation({
        user_id: linkedUser.id,
        organizations_id: [organization.id],
      });
      const serviceInstance = await TestHelper.serviceInstance.create();
      await TestHelper.platformConfiguration.create({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.subscription.create({
        service_instance_id: serviceInstance.id,
        organization_id: organization.id,
      });

      const call = OrganizationApp.deleteOrganization(organization.id);

      await expect(call).rejects.toThrow(
        ErrorCode.DeleteOrganizationBlockedByConnectedProduct
      );
      expect(
        await TestHelper.organization.load({ id: organization.id })
      ).toBeDefined();

      await TestHelper.subscription.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.platformConfiguration.delete({
        service_instance_id: serviceInstance.id,
      });
      await TestHelper.serviceInstance.delete({ id: serviceInstance.id });
      await TestHelper.organization.delete({ id: organization.id });
      await UserHelper.removeUser({ id: linkedUser.id });
    });

    it('should not apply the guards on a personal space organization', async () => {
      const user = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      const personalSpaceId = OrganizationHelper.personalSpaceIdOf(user);
      const pendingUser = await UserProvisioningDomain.createUser(
        { email: `delete-orga-${uuidv4()}@delete-orga-test.io` },
        { sendWelcomeEmail: false }
      );
      await UserOrganizationPendingDomain.insertNewUserOrganizationPending({
        user_id: pendingUser.id,
        organization_id: personalSpaceId,
      });
      await UserDomain.deleteUserBy({ id: user.id });

      await OrganizationApp.deleteOrganization(personalSpaceId);

      expect(
        await TestHelper.organization.load({ id: personalSpaceId })
      ).toBeUndefined();
    });
  });

  describe('loadOrganizationMembers', () => {
    const ORGANIZATION: Organization = {
      id: 'c0a8e6f2-4d1b-4e3a-9f6c-2b7d8e9a1c34' as OrganizationId,
      name: 'Readable organization',
      domains: null,
      personal_space: false,
    };
    const CALLER = {
      id: '5d0c1e7a-8b2f-4c6d-9e3a-1f4b7c8d2e90' as UserId,
      email: 'caller@admin-hub.test',
    } as User;
    // Without READ_ORGANIZATION_MEMBERS: restricted to the organizations the caller belongs to
    const RESTRICTED_CALLER = TestHelper.caller.build(CALLER, [ORGANIZATION]);
    const AFTER = btoa('2');
    const SEARCH_TERM = 'needle';
    const CONNECTION: OrganizationMemberConnection = {
      edges: [],
      pageInfo: {
        startCursor: null,
        endCursor: null,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: 0,
    };
    // Every refusal answers exactly this error, so that a refused id cannot be told from a missing one
    const ORGANIZATION_NOT_FOUND = new Error(ErrorCode.OrganizationNotFound);

    const mockMembership = (isMember: boolean) =>
      vi
        .spyOn(securityGuard, 'isUserInOrganization')
        .mockResolvedValue(isMember);
    const mockOrganization = (organization: Organization | undefined) =>
      vi
        .spyOn(OrganizationDomain, 'loadFirstProfessionalOrganizationBy')
        .mockResolvedValue(organization);
    const mockMemberConnection = () =>
      vi
        .spyOn(UserDomain, 'loadOrganizationMemberConnection')
        .mockResolvedValue(CONNECTION);

    beforeEach(() => {
      requestContext.set({ user: RESTRICTED_CALLER });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should refuse an organization id that is not a UUID as an unknown organization, without reading the database', async () => {
      // Given
      const membershipSpy = mockMembership(true);
      const organizationSpy = mockOrganization(ORGANIZATION);
      const memberConnectionSpy = mockMemberConnection();

      // When
      const call = OrganizationApp.loadOrganizationMembers(
        'not-a-uuid' as OrganizationId,
        { first: 20 }
      );

      // Then
      await expect(call).rejects.toStrictEqual(ORGANIZATION_NOT_FOUND);
      expect(membershipSpy).not.toHaveBeenCalled();
      expect(organizationSpy).not.toHaveBeenCalled();
      expect(memberConnectionSpy).not.toHaveBeenCalled();
    });

    it('should refuse an organization the restricted caller is not a member of as an unknown organization, before loading it', async () => {
      // Given
      const membershipSpy = mockMembership(false);
      const organizationSpy = mockOrganization(ORGANIZATION);
      const memberConnectionSpy = mockMemberConnection();

      // When
      const call = OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
        first: 20,
      });

      // Then
      await expect(call).rejects.toStrictEqual(ORGANIZATION_NOT_FOUND);
      expect(membershipSpy).toHaveBeenCalledExactlyOnceWith(
        RESTRICTED_CALLER,
        ORGANIZATION.id
      );
      expect(organizationSpy).not.toHaveBeenCalled();
      expect(memberConnectionSpy).not.toHaveBeenCalled();
    });

    it('should load the organization of a restricted caller who is a member of it', async () => {
      // Given
      const membershipSpy = mockMembership(true);
      const organizationSpy = mockOrganization(ORGANIZATION);
      mockMemberConnection();

      // When
      await OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
        first: 20,
      });

      // Then
      expect(membershipSpy).toHaveBeenCalledExactlyOnceWith(
        RESTRICTED_CALLER,
        ORGANIZATION.id
      );
      expect(organizationSpy).toHaveBeenCalledExactlyOnceWith({
        id: ORGANIZATION.id,
      });
    });

    it.each([
      ['READ_ORGANIZATION_MEMBERS', CAPABILITY_READ_ORGANIZATION_MEMBERS],
      ['BYPASS', CAPABILITY_BYPASS],
    ])(
      'should load the organization of a %s holder without checking their membership',
      async (_, capability) => {
        // Given
        requestContext.set({
          user: TestHelper.caller.build(CALLER, [], [capability]),
        });
        const membershipSpy = mockMembership(false);
        const organizationSpy = mockOrganization(ORGANIZATION);
        const memberConnectionSpy = mockMemberConnection();

        // When
        await OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
          first: 20,
        });

        // Then
        expect(membershipSpy).not.toHaveBeenCalled();
        expect(organizationSpy).toHaveBeenCalledExactlyOnceWith({
          id: ORGANIZATION.id,
        });
        expect(memberConnectionSpy).toHaveBeenCalledOnce();
      }
    );

    it('should refuse an organization that is not loaded, unknown or a personal space, as an unknown organization', async () => {
      // Given
      mockMembership(true);
      mockOrganization(undefined);
      const memberConnectionSpy = mockMemberConnection();

      // When
      const call = OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
        first: 20,
      });

      // Then
      await expect(call).rejects.toStrictEqual(ORGANIZATION_NOT_FOUND);
      expect(memberConnectionSpy).not.toHaveBeenCalled();
    });

    it.each([
      [1000, 100],
      [101, 100],
      [100, 100],
      [20, 20],
      [1, 1],
      [0, 0],
    ])(
      'should load a page of %i members as a page of %i',
      async (first, expectedFirst) => {
        // Given
        mockMembership(true);
        mockOrganization(ORGANIZATION);
        const memberConnectionSpy = mockMemberConnection();

        // When
        await OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
          first,
        });

        // Then
        expect(memberConnectionSpy).toHaveBeenCalledExactlyOnceWith(
          ORGANIZATION.id,
          expect.objectContaining({ first: expectedFirst })
        );
      }
    );

    it.each([-1, -5])(
      'should refuse a page of %i members before reading the database',
      async (first) => {
        // Given
        const membershipSpy = mockMembership(true);
        const organizationSpy = mockOrganization(ORGANIZATION);
        const memberConnectionSpy = mockMemberConnection();

        // When
        const call = OrganizationApp.loadOrganizationMembers(ORGANIZATION.id, {
          first,
        });

        // Then
        await expect(call).rejects.toThrow(ErrorCode.InvalidPageSize);
        expect(membershipSpy).not.toHaveBeenCalled();
        expect(organizationSpy).not.toHaveBeenCalled();
        expect(memberConnectionSpy).not.toHaveBeenCalled();
      }
    );

    it('should load the members of the loaded organization with the cursor and the search term', async () => {
      // Given
      mockMembership(true);
      mockOrganization(ORGANIZATION);
      const memberConnectionSpy = mockMemberConnection();

      // When
      const connection = await OrganizationApp.loadOrganizationMembers(
        ORGANIZATION.id,
        { first: 20, after: AFTER, searchTerm: SEARCH_TERM }
      );

      // Then
      expect(memberConnectionSpy).toHaveBeenCalledExactlyOnceWith(
        ORGANIZATION.id,
        { first: 20, after: AFTER, searchTerm: SEARCH_TERM }
      );
      expect(connection).toEqual(CONNECTION);
    });
  });
});
