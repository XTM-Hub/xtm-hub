import { db } from '../../knexfile';
import {
  OrganizationCapability,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceRestriction,
} from '../__generated__/resolvers-types';
import { requestContext } from '../context/request.context';
import { OrganizationId } from '../model/kanel/public/Organization';
import { ServiceInstanceId } from '../model/kanel/public/ServiceInstance';
import { UserLoadUserBy } from '../model/user';
import { OrganizationDomain } from '../modules/organization-management/organization/organization.domain';
import { UserOrganizationDomain } from '../modules/organization-management/user/user-organization/user-organization.domain';
import { AuthHelper } from '../modules/security-management/capability/auth.helper';
import { SubscriptionDomain } from '../modules/subscription/subscription.domain';
import { UserServiceDomain } from '../modules/user-service/user-service.domain';
import { logApp } from '../utils/app-logger.util';
import { ErrorCode } from '../utils/error/error.code';
import { BadRequestError, ForbiddenAccess } from '../utils/error/error.util';
import { isUserAdminPlatform } from './access';
import { ApiTokenReach } from './api-token-reach';

export const securityGuard = {
  // An API token reaches its own organization only: another one is answered as if the user were not a member
  isUserInOrganization: async (
    user: UserLoadUserBy,
    organizationId: OrganizationId
  ): Promise<boolean> => {
    if (!ApiTokenReach.allowsOrganization(organizationId)) {
      return false;
    }
    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        user_id: user.id,
        organization_id: organizationId,
      });
    return !!userOrganization;
  },

  assertUserIsInOrganization: async (
    user: UserLoadUserBy,
    organizationId: OrganizationId
  ) => {
    if (!(await securityGuard.isUserInOrganization(user, organizationId))) {
      throw new Error(ErrorCode.UserIsNotInOrganization);
    }
  },

  assertUserIsAllowedOnOrganization: async (
    user: UserLoadUserBy,
    {
      organizationId,
      requiredCapability,
    }: {
      organizationId: OrganizationId;
      requiredCapability: OrganizationCapability;
    }
  ) => {
    const { isAllowed, isInOrganization } =
      await AuthHelper.isUserAllowedOnOrganization(user, {
        organizationId,
        requiredCapability,
      });

    if (!isAllowed) {
      const errorCode = isInOrganization
        ? ErrorCode.MissingCapabilityOnOrganization
        : ErrorCode.UserIsNotInOrganization;
      throw new Error(errorCode);
    }
  },

  assertUserCanModifyPlatformService: async (
    user: UserLoadUserBy,
    serviceDefinition: { identifier: ServiceDefinitionIdentifier }
  ) => {
    // Verify it's an OpenCTI, OpenAEV or XTM One platform
    const allowedIdentifiers = [
      ServiceDefinitionIdentifier.OpenctiRegistration,
      ServiceDefinitionIdentifier.OpenaevRegistration,
      ServiceDefinitionIdentifier.XtmoneRegistration,
    ];

    if (!allowedIdentifiers.includes(serviceDefinition.identifier)) {
      throw ForbiddenAccess(ErrorCode.PlatformTypeNotSupported);
    }

    await securityGuard.assertUserIsAllowedOnOrganization(user, {
      organizationId: user.selected_organization_id,
      requiredCapability: OrganizationCapability.ManagePlatformRegistration,
    });
  },

  assertUserCapabilities: async (
    requiredCapabilities: OrganizationCapability[],
    organizationId?: OrganizationId
  ) => {
    const user = requestContext.requireUser();
    const targetOrgId = organizationId || user.selected_organization_id;

    // Before the platform administrator check: an API token stays in its organization, with its capabilities
    const reachableCapabilities =
      ApiTokenReach.narrowCapabilities(requiredCapabilities);
    if (
      (targetOrgId && !ApiTokenReach.allowsOrganization(targetOrgId)) ||
      (requiredCapabilities.length > 0 && reachableCapabilities.length === 0)
    ) {
      throw ForbiddenAccess(ErrorCode.MissingCapabilityOnOrganization);
    }

    if (isUserAdminPlatform(user)) return;

    if (!targetOrgId) {
      throw BadRequestError('Organization context required');
    }

    // Check if user has required capabilities in the specific organization
    const userCapabilities = await db('UserOrganization_Capability')
      .select('User_Organization.*')
      .innerJoin(
        'User_Organization',
        'UserOrganization_Capability.user_organization_id',
        'User_Organization.id'
      )
      .where({
        'User_Organization.user_id': user.id,
        'User_Organization.organization_id': targetOrgId,
      })
      .whereIn('UserOrganization_Capability.name', reachableCapabilities)
      .first();

    if (!userCapabilities) {
      throw ForbiddenAccess(ErrorCode.MissingCapabilityOnOrganization);
    }
  },

  assertEmailMatchesOrganization: async (
    user: UserLoadUserBy,
    email: string,
    organizationId?: OrganizationId
  ) => {
    if (isUserAdminPlatform(user)) return;

    const [organizationFromEmail] =
      await OrganizationDomain.loadOrganizationsFromEmail(email);

    if (organizationId !== organizationFromEmail?.id) {
      logApp.warn(
        'You cannot add a user whose email domain is outside your organization'
      );
      throw ForbiddenAccess(ErrorCode.EmailOutsideOrganizationError);
    }
  },

  assertUserPortalCapabilities: async (
    user: UserLoadUserBy,
    requiredCapabilities: PortalCapability[]
  ) => {
    if (isUserAdminPlatform(user)) return;

    const requiredCapabilityNames = new Set<string>(requiredCapabilities);
    const hasRequiredPortalCapability = user.capabilities.some(
      (capability) =>
        capability.name !== null && requiredCapabilityNames.has(capability.name)
    );

    if (!hasRequiredPortalCapability) {
      throw ForbiddenAccess(ErrorCode.MissingCapabilityOnOrganization);
    }
  },
};

export const assertUserHasCapaOnService = async (
  user: UserLoadUserBy,
  serviceInstanceId: ServiceInstanceId,
  capabilities: ServiceRestriction[]
) => {
  if (isUserAdminPlatform(user)) return;

  const subscription = await SubscriptionDomain.loadSubscriptionBy({
    service_instance_id: serviceInstanceId,
    organization_id: user.selected_organization_id,
  });
  if (!subscription) {
    throw ForbiddenAccess(ErrorCode.MissingCapabilityOnService);
  }
  const [existingUserService] =
    await UserServiceDomain.loadUserServiceWithCapabilitiesBy({
      user_id: user.id,
      subscription_id: subscription.id,
    });

  if (
    !existingUserService.user_service_capability.some(
      (c: {
        subscription_capability?: { service_capability?: { name?: string } };
      }) =>
        capabilities.includes(
          c?.subscription_capability?.service_capability
            ?.name as ServiceRestriction
        )
    )
  ) {
    throw ForbiddenAccess(ErrorCode.MissingCapabilityOnService);
  }
};
