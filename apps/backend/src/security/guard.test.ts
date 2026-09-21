import { MockInstance } from '@vitest/spy';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAPABILITY_MODIFY_TRIALS,
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  requestContextAdminSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../tests/tests.const';
import {
  OrganizationCapability,
  PortalCapability,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import { AuthHelper } from '../modules/security-management/capability/auth.helper';
import { SubscriptionDomain } from '../modules/subscription/subscription.domain';
import { UserServiceDomain } from '../modules/user-service/user-service.domain';
import { ErrorCode } from '../utils/error/error.code';
import * as access from './access';
import { assertUserHasCapaOnService, securityGuard } from './guard';

describe('security Guard', () => {
  let isUserAllowedOnOrganizationSpy: MockInstance;
  beforeEach(() => {
    isUserAllowedOnOrganizationSpy = vi.spyOn(
      AuthHelper,
      'isUserAllowedOnOrganization'
    );
  });

  describe('assertUserIsAllowedOnOrganization', () => {
    it('should throw a user not in organization error when user is not in organization', async () => {
      isUserAllowedOnOrganizationSpy.mockResolvedValue({
        isAllowed: false,
        isInOrganization: false,
      });

      const call = securityGuard.assertUserIsAllowedOnOrganization(
        contextBypassUser.user,
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          requiredCapability: OrganizationCapability.AdministrateOrganization,
        }
      );

      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should throw a missing capability error when user is not in organization', async () => {
      isUserAllowedOnOrganizationSpy.mockResolvedValue({
        isAllowed: false,
        isInOrganization: true,
      });

      const call = securityGuard.assertUserIsAllowedOnOrganization(
        contextBypassUser.user,
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          requiredCapability: OrganizationCapability.AdministrateOrganization,
        }
      );

      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should not throw an error when user is allowed', async () => {
      isUserAllowedOnOrganizationSpy.mockResolvedValue({
        isAllowed: true,
      });

      await securityGuard.assertUserIsAllowedOnOrganization(
        contextBypassUser.user,
        {
          organizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
          requiredCapability: OrganizationCapability.AdministrateOrganization,
        }
      );
    });

    it('should verify user secondOrga capability based on selected_organization_id', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      await expect(
        securityGuard.assertUserCapabilities([
          OrganizationCapability.AdministrateOrganization,
        ])
      ).resolves.not.toThrow();

      const call = securityGuard.assertUserCapabilities([
        OrganizationCapability.ManagePlatformRegistration,
      ]);
      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should verify user secondOrga capability with specific organization_id', async () => {
      requestContext.set(requestContextAdminSecondOrga);
      await expect(
        securityGuard.assertUserCapabilities(
          [OrganizationCapability.AdministrateOrganization],
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        )
      ).resolves.not.toThrow();
    });

    it('should not throw when user has bypass capability for portal capability checks', async () => {
      await expect(
        securityGuard.assertUserPortalCapabilities(contextBypassUser.user, [
          PortalCapability.ManageDeployment,
        ])
      ).resolves.not.toThrow();
    });

    it('should throw when user does not have required portal capability', async () => {
      const call = securityGuard.assertUserPortalCapabilities(
        requestContextAdminSecondOrga.user,
        [PortalCapability.ManageDeployment]
      );

      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should not throw when user has one required portal capability', async () => {
      const userWithModifyTrials = {
        ...requestContextAdminSecondOrga.user,
        capabilities: [CAPABILITY_MODIFY_TRIALS],
      };

      await expect(
        securityGuard.assertUserPortalCapabilities(userWithModifyTrials, [
          PortalCapability.ModifyTrials,
          PortalCapability.ManageDeployment,
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('assertEmailMatchesOrganization', () => {
    let loadOrganizationsFromEmailSpy: MockInstance;

    beforeEach(() => {
      loadOrganizationsFromEmailSpy = vi.spyOn(
        OrganizationDomain,
        'loadOrganizationsFromEmail'
      );
    });

    it('should not throw when user has bypass capability, even on a mismatched domain', async () => {
      loadOrganizationsFromEmailSpy.mockResolvedValue([
        { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
      ]);

      await expect(
        securityGuard.assertEmailMatchesOrganization(
          contextBypassUser.user,
          'user@filigran.io',
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        )
      ).resolves.not.toThrow();
      expect(loadOrganizationsFromEmailSpy).not.toHaveBeenCalled();
    });

    it('should not throw when the email domain matches the target organization', async () => {
      loadOrganizationsFromEmailSpy.mockResolvedValue([
        { id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID },
      ]);

      await expect(
        securityGuard.assertEmailMatchesOrganization(
          requestContextAdminSecondOrga.user,
          'user@second-orga.com',
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
        )
      ).resolves.not.toThrow();
    });

    it('should throw EmailOutsideOrganizationError when the email domain does not match the target organization', async () => {
      loadOrganizationsFromEmailSpy.mockResolvedValue([
        { id: TEST_ORGANIZATIONS.FILIGRAN.ID },
      ]);

      const call = securityGuard.assertEmailMatchesOrganization(
        requestContextAdminSecondOrga.user,
        'user@filigran.io',
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );

      await expect(call).rejects.toThrow(
        ErrorCode.EmailOutsideOrganizationError
      );
    });

    it('should throw EmailOutsideOrganizationError when no organization matches the email domain', async () => {
      loadOrganizationsFromEmailSpy.mockResolvedValue([]);

      const call = securityGuard.assertEmailMatchesOrganization(
        requestContextAdminSecondOrga.user,
        'user@unknown-domain.com',
        TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID
      );

      await expect(call).rejects.toThrow(
        ErrorCode.EmailOutsideOrganizationError
      );
    });
  });

  describe('assertUserHasCapaOnService', () => {
    let isUserGrantedSpy: MockInstance;
    let loadSubscriptionBySpy: MockInstance;
    let loadUserServiceWithCapabilitiesBySpy: MockInstance;

    beforeEach(() => {
      isUserGrantedSpy = vi.spyOn(access, 'isUserGranted');
      loadSubscriptionBySpy = vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionBy'
      );
      loadUserServiceWithCapabilitiesBySpy = vi.spyOn(
        UserServiceDomain,
        'loadUserServiceWithCapabilitiesBy'
      );

      isUserGrantedSpy.mockReturnValue(false);
      loadSubscriptionBySpy.mockResolvedValue({ id: 'subscription-id' });
      loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
        {
          user_service_capability: [],
        },
      ]);
    });

    it('should bypass checks when user is granted', async () => {
      // Given
      isUserGrantedSpy.mockReturnValue(true);

      // When
      await assertUserHasCapaOnService(
        contextBypassUser.user,
        SERVICES.INSTANCES.EPIC.ID,
        [ServiceRestriction.Upsert]
      );

      // Then
      expect(loadSubscriptionBySpy).not.toHaveBeenCalled();
      expect(loadUserServiceWithCapabilitiesBySpy).not.toHaveBeenCalled();
    });

    it('should allow access when one required capability is present', async () => {
      // Given
      loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
        {
          user_service_capability: [
            {
              subscription_capability: {
                service_capability: {
                  name: ServiceRestriction.Upsert,
                },
              },
            },
          ],
        },
      ]);

      // When
      const call = assertUserHasCapaOnService(
        requestContextAdminSecondOrga.user,
        SERVICES.INSTANCES.EPIC.ID,
        [ServiceRestriction.Upsert]
      );

      // Then
      await expect(call).resolves.toBeUndefined();
      expect(loadSubscriptionBySpy).toHaveBeenCalledWith({
        service_instance_id: SERVICES.INSTANCES.EPIC.ID,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      expect(loadUserServiceWithCapabilitiesBySpy).toHaveBeenCalledWith({
        user_id: requestContextAdminSecondOrga.user.id,
        subscription_id: 'subscription-id',
      });
    });

    it('should throw MissingCapabilityOnService when no required capability is present', async () => {
      // Given
      loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
        {
          user_service_capability: [
            {
              subscription_capability: {
                service_capability: {
                  name: ServiceRestriction.Upload,
                },
              },
            },
          ],
        },
      ]);

      // When
      const call = assertUserHasCapaOnService(
        requestContextAdminSecondOrga.user,
        SERVICES.INSTANCES.EPIC.ID,
        [ServiceRestriction.Upsert]
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.MissingCapabilityOnService);
    });

    it.each`
      capabilities
      ${[null, {}, { subscription_capability: null }, { subscription_capability: { service_capability: null } }, { subscription_capability: { service_capability: { name: null } } }]}
      ${[{ subscription_capability: { service_capability: { name: undefined } } }]}
    `(
      'should ignore nullish capability entries and throw when no valid capability matches ($capabilities)',
      async ({ capabilities }) => {
        // Given
        loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
          {
            user_service_capability: capabilities,
          },
        ]);

        // When
        const call = assertUserHasCapaOnService(
          requestContextAdminSecondOrga.user,
          SERVICES.INSTANCES.EPIC.ID,
          [ServiceRestriction.Upsert]
        );

        // Then
        await expect(call).rejects.toThrow(
          ErrorCode.MissingCapabilityOnService
        );
      }
    );

    it('should allow access when one of multiple required capabilities is present', async () => {
      // Given
      loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
        {
          user_service_capability: [
            {
              subscription_capability: {
                service_capability: {
                  name: ServiceRestriction.Delete,
                },
              },
            },
          ],
        },
      ]);

      // When
      const call = assertUserHasCapaOnService(
        requestContextAdminSecondOrga.user,
        SERVICES.INSTANCES.EPIC.ID,
        [ServiceRestriction.Upsert, ServiceRestriction.Delete]
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });
});
