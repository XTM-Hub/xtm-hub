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
import { isUserAdminPlatform, isUserGranted } from './access';

export const securityGuard = {
  assertUserIsInOrganization: async (
    user: UserLoadUserBy,
    organizationId: OrganizationId
  ) => {
    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        user_id: user.id,
        organization_id: organizationId,
      });

    if (!userOrganization) {
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
    // Verify it's an OpenCTI or OpenAEV platform
    const allowedIdentifiers = [
      ServiceDefinitionIdentifier.OpenctiRegistration,
      ServiceDefinitionIdentifier.OpenaevRegistration,
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

    if (isUserAdminPlatform(user)) return;

    const targetOrgId = organizationId || user.selected_organization_id;

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
      .whereIn('UserOrganization_Capability.name', requiredCapabilities)
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

export const assertUserCanManageService = async (
  user: UserLoadUserBy,
  serviceInstanceId: ServiceInstanceId
) => {
  if (isUserGranted(user)) return;

  const subscription = await SubscriptionDomain.loadSubscriptionBy({
    service_instance_id: serviceInstanceId,
    organization_id: user.selected_organization_id,
  });

  if (!subscription) {
    throw ForbiddenAccess(ErrorCode.MissingCapabilityOnService);
  }
  const userServiceCapability =
    await UserServiceDomain.loadUserServiceGenericCapability(
      user.id,
      subscription.id,
      ServiceRestriction.ManageAccess
    );

  if (!userServiceCapability) {
    throw ForbiddenAccess(ErrorCode.MissingCapabilityOnService);
  }
};
export const assertUserHasCapaOnService = async (
  user: UserLoadUserBy,
  serviceInstanceId: ServiceInstanceId,
  capabilities: ServiceRestriction[]
) => {
  if (isUserGranted(user)) return;

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
