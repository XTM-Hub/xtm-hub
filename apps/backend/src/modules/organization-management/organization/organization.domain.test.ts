import { v4 as uuidv4 } from 'uuid';
import { beforeAll, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  TEST_ORGANIZATIONS,
} from '../../../../tests/tests.const';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import ServiceInstance from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
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
});
