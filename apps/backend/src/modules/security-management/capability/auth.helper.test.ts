import { describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../../tests/tests.const';
import { OrganizationCapability } from '../../../__generated__/resolvers-types';
import { CAPABILITY_BYPASS } from '../../../portal.const';

import { UserServiceId } from '../../../model/kanel/public/UserService';
import { AuthHelper } from './auth.helper';

describe('authHelper', () => {
  describe('checkUserServiceIsInServiceInstance', () => {
    it('should return true when the UserService belongs to the expected ServiceInstance', async () => {
      const sub = await TestHelper.subscription.create({
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        start_date: new Date(),
        end_date: undefined,
      });
      const userService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: sub.id,
      });

      const result = await AuthHelper.checkUserServiceIsInServiceInstance(
        userService?.id as UserServiceId,
        SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID
      );

      expect(result).toBe(true);
    });

    it('should return false when the UserService belongs to a different ServiceInstance', async () => {
      const sub = await TestHelper.subscription.create({
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      const userService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: sub.id,
      });

      const result = await AuthHelper.checkUserServiceIsInServiceInstance(
        userService?.id as UserServiceId,
        SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID
      );

      expect(result).toBe(false);
    });

    it('should return false for a UserService from a subscription on a different instance', async () => {
      const secondSub = await TestHelper.subscription.create({
        service_instance_id: SERVICES.INSTANCES.OPENAEV_SCENARIOS.ID,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        start_date: new Date(),
        end_date: undefined,
      });
      const userService = await TestHelper.user_Service.create({
        user_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.ID,
        subscription_id: secondSub.id,
      });

      const result = await AuthHelper.checkUserServiceIsInServiceInstance(
        userService?.id as UserServiceId,
        SERVICES.INSTANCES.INTEGRATIONS.ID
      );

      expect(result).toBe(false);

      await TestHelper.user_Service.delete({
        subscription_id: secondSub.id,
      });
      await TestHelper.subscription.delete({ id: secondSub.id });
    });
  });

  describe('isUserAllowed', () => {
    it('should allow user if he has bypass capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [CAPABILITY_BYPASS],
        organizationCapabilities: [],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should allow user if he has the required capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [
          OrganizationCapability.ManagePlatformRegistration,
        ],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should allow user if he has the administrate organization capability', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [
          OrganizationCapability.AdministrateOrganization,
        ],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeTruthy();
    });

    it('should not allow user if he does not have the required capabilities', async () => {
      const result = AuthHelper.isUserAllowed({
        userCapabilities: [],
        organizationCapabilities: [],
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      expect(result).toBeFalsy();
    });
  });
});
