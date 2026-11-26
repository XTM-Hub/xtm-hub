import { v4 as uuidv4 } from 'uuid';
import { beforeAll, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  requestContextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { requestContext } from '../../../context/request.context';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import ServiceInstance from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
import { CAPABILITY_BYPASS } from '../../../portal.const';
import { OrganizationDomain } from './organization.domain';

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
});
