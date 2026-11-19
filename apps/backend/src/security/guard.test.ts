import { MockInstance } from '@vitest/spy';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../tests/helper/test.helper';
import {
  CAPABILITY_MODIFY_TRIALS,
  // eslint-disable-next-line no-restricted-imports
  contextBypassUser,
  requestContextAdminSecondOrga,
  requestContextSimpleUserFiligran2,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../tests/tests.const';
import {
  ApiTokenScope,
  OrganizationCapability,
  PortalCapability,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import Organization, {
  OrganizationId,
} from '../model/kanel/public/Organization';
import User from '../model/kanel/public/User';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import { UserDomain } from '../modules/organization-management/user/user-domain/user.domain';
import { UserProvisioningDomain } from '../modules/organization-management/user/user-provisioning/user-provisioning.domain';
import { UserHelper } from '../modules/organization-management/user/user.helper';
import { AuthHelper } from '../modules/security-management/capability/auth.helper';
import { SubscriptionDomain } from '../modules/subscription/subscription.domain';
import { UserServiceDomain } from '../modules/user-service/user-service.domain';
import { ErrorCode } from '../utils/error/error.code';
import { ErrorType } from '../utils/error/error.type';
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
    let loadSubscriptionBySpy: MockInstance;
    let loadUserServiceWithCapabilitiesBySpy: MockInstance;

    beforeEach(() => {
      loadSubscriptionBySpy = vi.spyOn(
        SubscriptionDomain,
        'loadSubscriptionBy'
      );
      loadUserServiceWithCapabilitiesBySpy = vi.spyOn(
        UserServiceDomain,
        'loadUserServiceWithCapabilitiesBy'
      );

      loadSubscriptionBySpy.mockResolvedValue({ id: 'subscription-id' });
      loadUserServiceWithCapabilitiesBySpy.mockResolvedValue([
        {
          user_service_capability: [],
        },
      ]);
    });

    it('should bypass checks when user is a platform admin', async () => {
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

    it('should throw MissingCapabilityOnService when a logged-in user has no capability on the service', async () => {
      // When
      const call = assertUserHasCapaOnService(
        requestContextSimpleUserFiligran2.user,
        SERVICES.INSTANCES.EPIC.ID,
        [ServiceRestriction.Upsert]
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.MissingCapabilityOnService);
      expect(loadSubscriptionBySpy).toHaveBeenCalled();
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

describe('security Guard with an API token', () => {
  // The user holds the same capabilities in two organizations: a token pinned to one must not reach the other
  const CAPABILITIES = [
    OrganizationCapability.ManageAccess,
    OrganizationCapability.ManagePlatformRegistration,
  ];
  let tokenOrganization: Organization;
  let otherOrganization: Organization;
  let user: User;

  const addMember = async (
    organizationId: OrganizationId,
    capabilities: OrganizationCapability[]
  ) => {
    const userOrganization = await TestHelper.user_Organization.create({
      user_id: user.id,
      organization_id: organizationId,
    });
    await Promise.all(
      capabilities.map((name) =>
        TestHelper.user_OrganizationCapability.create({
          user_organization_id: userOrganization!.id,
          name,
        })
      )
    );
  };

  const actAsToken = (scope: ApiTokenScope = ApiTokenScope.ReadWrite) =>
    TestHelper.apiToken.actAs(user.id, tokenOrganization.id, scope);

  // A session with the token organization selected, the same user as the token's
  const actAsSession = async () => {
    await TestHelper.user.update(
      { id: user.id },
      { selected_organization_id: tokenOrganization.id }
    );
    requestContext.set({
      user: (await UserDomain.loadUserBy({ 'User.id': user.id }))!,
    });
  };

  beforeEach(async () => {
    tokenOrganization = await TestHelper.organization.create();
    otherOrganization = await TestHelper.organization.create();
    user = await UserProvisioningDomain.createUser(
      { email: `api-token-guard-${uuidv4()}@api-token-guard-test.io` },
      { sendWelcomeEmail: false }
    );
    await addMember(tokenOrganization.id, CAPABILITIES);
    await addMember(otherOrganization.id, CAPABILITIES);
  });

  afterEach(async () => {
    await UserHelper.removeUser({ id: user.id });
    await TestHelper.organization.delete({ id: tokenOrganization.id });
    await TestHelper.organization.delete({ id: otherOrganization.id });
  });

  describe('assertUserCapabilities', () => {
    it('should refuse an organization other than the token one with FORBIDDEN', async () => {
      // Given
      await actAsToken();

      // When
      const call = securityGuard.assertUserCapabilities(
        [OrganizationCapability.ManageAccess],
        otherOrganization.id
      );

      // Then
      await expect(call).rejects.toMatchObject({
        message: ErrorCode.MissingCapabilityOnOrganization,
        extensions: { code: ErrorType.ForbiddenAccess },
      });
    });

    it('should allow the token organization with a capability the token kept', async () => {
      // Given
      await actAsToken();

      // When
      const call = securityGuard.assertUserCapabilities(
        [OrganizationCapability.ManageAccess],
        tokenOrganization.id
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });

    it('should refuse a capability the token took away, even in the token organization', async () => {
      // Given a user administering the token organization, whose read_write token has no ADMINISTRATE_ORGANIZATION
      const membership = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: tokenOrganization.id,
      });
      await TestHelper.user_OrganizationCapability.create({
        user_organization_id: membership.id,
        name: OrganizationCapability.AdministrateOrganization,
      });
      await actAsToken(ApiTokenScope.ReadWrite);

      // When
      const call = securityGuard.assertUserCapabilities(
        [OrganizationCapability.AdministrateOrganization],
        tokenOrganization.id
      );

      // Then
      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should let a session user reach every organization where they hold the capability', async () => {
      // Given
      await actAsSession();

      // When
      const call = securityGuard.assertUserCapabilities(
        [OrganizationCapability.ManageAccess],
        otherOrganization.id
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });

  describe('assertUserIsAllowedOnOrganization', () => {
    it('should refuse an organization other than the token one as if the user were not a member', async () => {
      // Given
      await actAsToken();

      // When
      const call = securityGuard.assertUserIsAllowedOnOrganization(
        requestContext.requireUser(),
        {
          organizationId: otherOrganization.id,
          requiredCapability: OrganizationCapability.ManagePlatformRegistration,
        }
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should refuse ADMINISTRATE_ORGANIZATION as an implied capability once the token took it away', async () => {
      // Given a user who administers the token organization without MANAGE_ACCESS
      const membership = await TestHelper.user_Organization.load({
        user_id: user.id,
        organization_id: tokenOrganization.id,
      });
      await TestHelper.user_OrganizationCapability.delete({
        user_organization_id: membership.id,
      });
      await TestHelper.user_OrganizationCapability.create({
        user_organization_id: membership.id,
        name: OrganizationCapability.AdministrateOrganization,
      });
      await actAsToken(ApiTokenScope.ReadWrite);

      // When
      const call = securityGuard.assertUserIsAllowedOnOrganization(
        requestContext.requireUser(),
        {
          organizationId: tokenOrganization.id,
          requiredCapability: OrganizationCapability.ManageAccess,
        }
      );

      // Then
      await expect(call).rejects.toThrow(
        ErrorCode.MissingCapabilityOnOrganization
      );
    });

    it('should allow the token organization with a capability the token kept', async () => {
      // Given
      await actAsToken();

      // When
      const call = securityGuard.assertUserIsAllowedOnOrganization(
        requestContext.requireUser(),
        {
          organizationId: tokenOrganization.id,
          requiredCapability: OrganizationCapability.ManagePlatformRegistration,
        }
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });

    it('should let a session user reach every organization where they hold the capability', async () => {
      // Given
      await actAsSession();

      // When
      const call = securityGuard.assertUserIsAllowedOnOrganization(
        requestContext.requireUser(),
        {
          organizationId: otherOrganization.id,
          requiredCapability: OrganizationCapability.ManagePlatformRegistration,
        }
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });

  describe('assertUserIsInOrganization', () => {
    it('should refuse an organization other than the token one as if the user were not a member', async () => {
      // Given
      await actAsToken(ApiTokenScope.Read);

      // When
      const call = securityGuard.assertUserIsInOrganization(
        requestContext.requireUser(),
        otherOrganization.id
      );

      // Then
      await expect(call).rejects.toThrow(ErrorCode.UserIsNotInOrganization);
    });

    it('should allow the token organization', async () => {
      // Given
      await actAsToken(ApiTokenScope.Read);

      // When
      const call = securityGuard.assertUserIsInOrganization(
        requestContext.requireUser(),
        tokenOrganization.id
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });

    it('should let a session user reach every organization they belong to', async () => {
      // Given
      await actAsSession();

      // When
      const call = securityGuard.assertUserIsInOrganization(
        requestContext.requireUser(),
        otherOrganization.id
      );

      // Then
      await expect(call).resolves.toBeUndefined();
    });
  });
});
