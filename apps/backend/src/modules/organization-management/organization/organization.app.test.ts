import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  CAPABILITY_READ_ORGANIZATION_MEMBERS,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { OrganizationMemberConnection } from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import CapabilityPortal from '../../../model/kanel/public/CapabilityPortal';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { ErrorCode, NotFoundErrorCode } from '../../../utils/error/error.code';
import { TelemetryApp } from '../../telemetry/telemetry.app';
import { TelemetrySource } from '../../telemetry/telemetry.const';
import { TelemetryEventType } from '../../telemetry/telemetry.types';
import { UserDomain } from '../user/user-domain/user.domain';
import { UserOrganizationDomain } from '../user/user-organization/user-organization.domain';
import { UserOrganizationPendingDomain } from '../user/user-pending/user-organization-pending.domain';
import { UserProvisioningDomain } from '../user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../user/user.helper';
import { OrganizationApp } from './organization.app';
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
    const FILIGRAN = TEST_ORGANIZATIONS.FILIGRAN;
    const SECOND = TEST_ORGANIZATIONS.SECOND_ORGANIZATION;
    // An organization id no organization has
    const UNKNOWN_ORGANIZATION_ID =
      'f7a1c0de-0000-4000-8000-0000000000aa' as OrganizationId;
    const PAGE_SIZE = 20;
    // Compared exactly: ORGANIZATION_NOT_FOUND contains NOT_FOUND, so toThrow would accept one for the other
    const NOT_FOUND = new Error(NotFoundErrorCode.NotFound);
    const ORGANIZATION_NOT_FOUND = new Error(ErrorCode.OrganizationNotFound);
    const SECOND_MEMBER_IDS: string[] = [
      SECOND.USERS.ADMIN_ORGA.ID,
      SECOND.USERS.REGISTERER.ID,
      SECOND.USERS.SIMPLE.ID,
    ];
    // Without portal capability: a member of SECOND and of their own personal space only
    const MEMBER_OF_SECOND = requestContextSimpleUserSecondOrga;
    const withCapabilities = (capabilities: CapabilityPortal[]) => ({
      ...MEMBER_OF_SECOND,
      user: { ...MEMBER_OF_SECOND.user, capabilities },
    });
    const READ_ORGANIZATION_MEMBERS_HOLDER = withCapabilities([
      CAPABILITY_READ_ORGANIZATION_MEMBERS,
    ]);
    const BYPASS_HOLDER = withCapabilities([CAPABILITY_BYPASS]);

    const memberIds = ({ edges }: OrganizationMemberConnection) =>
      edges.map(({ node }) => node.id);

    const sizeOf = ({ edges, totalCount }: OrganizationMemberConnection) => ({
      edges: edges.length,
      totalCount: Number(totalCount),
    });

    it('should refuse the organization as unknown when its id is not a UUID', async () => {
      // Given
      requestContext.set(MEMBER_OF_SECOND);

      // When
      const call = OrganizationApp.loadOrganizationMembers(
        'not-a-uuid' as OrganizationId,
        { first: PAGE_SIZE }
      );

      // Then
      await expect(call).rejects.toStrictEqual(ORGANIZATION_NOT_FOUND);
    });

    // An unknown organization answers NOT_FOUND too: the membership is checked before the organization is loaded
    it.each`
      name                                    | organizationId
      ${'another organization'}               | ${FILIGRAN.ID}
      ${'an unknown organization'}            | ${UNKNOWN_ORGANIZATION_ID}
      ${'the personal space of another user'} | ${SECOND.USERS.ADMIN_ORGA.PERSONAL_SPACE_ID}
    `(
      'should refuse with NOT_FOUND when a caller without portal capability reads $name',
      async ({ organizationId }) => {
        // Given
        requestContext.set(MEMBER_OF_SECOND);

        // When
        const call = OrganizationApp.loadOrganizationMembers(organizationId, {
          first: PAGE_SIZE,
        });

        // Then
        await expect(call).rejects.toStrictEqual(NOT_FOUND);
      }
    );

    it('should return the members of their organization when a caller without portal capability is a member of it', async () => {
      // Given
      requestContext.set(MEMBER_OF_SECOND);

      // When
      const connection = await OrganizationApp.loadOrganizationMembers(
        SECOND.ID,
        { first: PAGE_SIZE }
      );

      // Then
      expect({
        ids: memberIds(connection).sort(),
        totalCount: Number(connection.totalCount),
      }).toEqual({
        ids: [...SECOND_MEMBER_IDS].sort(),
        totalCount: SECOND_MEMBER_IDS.length,
      });
    });

    it.each`
      name                                    | context
      ${'a READ_ORGANIZATION_MEMBERS holder'} | ${READ_ORGANIZATION_MEMBERS_HOLDER}
      ${'a BYPASS holder'}                    | ${BYPASS_HOLDER}
    `(
      'should return the members of an organization when $name who is not a member of it reads it',
      async ({ context }) => {
        // Given
        requestContext.set(context);
        const [filigranMembers] =
          await UserOrganizationDomain.countUsersInOrganizations([FILIGRAN.ID]);

        // When
        const connection = await OrganizationApp.loadOrganizationMembers(
          FILIGRAN.ID,
          { first: PAGE_SIZE }
        );

        // Then
        expect(sizeOf(connection)).toEqual({
          edges: filigranMembers?.count,
          totalCount: filigranMembers?.count,
        });
      }
    );

    it.each`
      name                                                                   | context                             | organizationId
      ${'a READ_ORGANIZATION_MEMBERS holder reads an unknown organization'}  | ${READ_ORGANIZATION_MEMBERS_HOLDER} | ${UNKNOWN_ORGANIZATION_ID}
      ${'a READ_ORGANIZATION_MEMBERS holder reads a personal space'}         | ${READ_ORGANIZATION_MEMBERS_HOLDER} | ${SECOND.USERS.ADMIN_ORGA.PERSONAL_SPACE_ID}
      ${'a member without portal capability reads their own personal space'} | ${MEMBER_OF_SECOND}                 | ${SECOND.USERS.SIMPLE.PERSONAL_SPACE_ID}
    `(
      'should refuse the organization as unknown when $name',
      async ({ context, organizationId }) => {
        // Given
        requestContext.set(context);

        // When
        const call = OrganizationApp.loadOrganizationMembers(organizationId, {
          first: PAGE_SIZE,
        });

        // Then
        await expect(call).rejects.toStrictEqual(ORGANIZATION_NOT_FOUND);
      }
    );

    // SECOND has fewer members than PAGE_SIZE: a page of PAGE_SIZE holds all of them
    it.each`
      first        | expectedEdges
      ${0}         | ${0}
      ${-1}        | ${0}
      ${-5}        | ${0}
      ${1}         | ${1}
      ${PAGE_SIZE} | ${SECOND_MEMBER_IDS.length}
    `(
      'should return $expectedEdges members and the totalCount when the page size is $first',
      async ({ first, expectedEdges }) => {
        // Given
        requestContext.set(MEMBER_OF_SECOND);

        // When
        const connection = await OrganizationApp.loadOrganizationMembers(
          SECOND.ID,
          { first }
        );

        // Then
        expect(sizeOf(connection)).toEqual({
          edges: expectedEdges,
          totalCount: SECOND_MEMBER_IDS.length,
        });
      }
    );

    it('should return the members matching the search term when one is given', async () => {
      // Given
      requestContext.set(MEMBER_OF_SECOND);

      // When
      const connection = await OrganizationApp.loadOrganizationMembers(
        SECOND.ID,
        { first: PAGE_SIZE, searchTerm: SECOND.USERS.REGISTERER.FIRST_NAME }
      );

      // Then
      expect(memberIds(connection)).toEqual([SECOND.USERS.REGISTERER.ID]);
    });

    it('should return the members after the cursor when one is given', async () => {
      // Given
      requestContext.set(MEMBER_OF_SECOND);
      const allMembers = await OrganizationApp.loadOrganizationMembers(
        SECOND.ID,
        { first: PAGE_SIZE }
      );
      const firstPage = await OrganizationApp.loadOrganizationMembers(
        SECOND.ID,
        { first: 1 }
      );

      // When
      const connection = await OrganizationApp.loadOrganizationMembers(
        SECOND.ID,
        { first: PAGE_SIZE, after: firstPage.pageInfo.endCursor }
      );

      // Then
      expect(memberIds(connection)).toEqual(memberIds(allMembers).slice(1));
    });
  });
});
