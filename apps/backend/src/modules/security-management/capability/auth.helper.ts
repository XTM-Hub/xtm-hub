import { db, dbRaw } from '../../../../knexfile';
import { CAPABILITY_BYPASS } from '../../../portal.const';

import {
  OrganizationCapability,
  PortalCapability,
  ServiceInstance,
} from '../../../__generated__/resolvers-types';
import CapabilityPortal from '../../../model/kanel/public/CapabilityPortal';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { SubscriptionMutator } from '../../../model/kanel/public/Subscription';
import { UserServiceId } from '../../../model/kanel/public/UserService';
import { UserLoadUserBy } from '../../../model/user';
import { ApiTokenReach } from '../../../security/api-token-reach';
import { ServiceCapabilityArgs } from '../../../security/directive-graphql/validator/service-capability.validator';
import { ErrorCode } from '../../../utils/error/error.code';
import { UserOrganizationDomain } from '../../organization-management/user/user-organization/user-organization.domain';
import { SubscriptionDomain } from '../../subscription/subscription.domain';
import { UserServiceDomain } from '../../user-service/user-service.domain';
import { UserOrganizationCapabilityDomain } from '../user-organization-capability/user-organization-capability.domain';

export const AuthHelper = {
  loadCapabilitiesByServiceId: async (
    user: UserLoadUserBy,
    serviceId: string
  ): Promise<{ capabilities: string[] } | undefined> => {
    const userId = user.id;
    const organizationId = user.selected_organization_id;
    return db<ServiceInstance>('ServiceInstance')
      .leftJoin('Subscription as subscription', function () {
        this.on(
          'subscription.service_instance_id',
          '=',
          'ServiceInstance.id'
        ).andOn(
          'subscription.organization_id',
          '=',
          dbRaw('?', [organizationId])
        );
      })
      .leftJoin('User_Service as userService', function () {
        this.on('userService.subscription_id', '=', 'subscription.id').andOn(
          'userService.user_id',
          '=',
          dbRaw('?', [userId])
        );
      })
      .leftJoin(
        'UserService_Capability as userServiceCapa',
        'userServiceCapa.user_service_id',
        '=',
        'userService.id'
      )
      .leftJoin(
        'Subscription_Capability',
        'userServiceCapa.subscription_capability_id',
        '=',
        'Subscription_Capability.id'
      )
      .leftJoin(
        'Service_Capability',
        'Subscription_Capability.service_capability_id',
        '=',
        'Service_Capability.id'
      )
      .leftJoin(
        'Generic_Service_Capability',
        'Generic_Service_Capability.id',
        '=',
        'userServiceCapa.generic_service_capability_id'
      )
      .select([
        dbRaw(
          `json_agg(
          CASE
            WHEN "Generic_Service_Capability".id IS NOT NULL THEN
              "Generic_Service_Capability".name
            WHEN "Service_Capability".id IS NOT NULL THEN
              "Service_Capability".name
            ELSE NULL
          END
        ) FILTER (WHERE "Generic_Service_Capability".id IS NOT NULL OR "Service_Capability".id IS NOT NULL) AS capabilities`
        ),
      ])
      .where('ServiceInstance.id', '=', dbRaw('?', [serviceId]))
      .groupBy(['ServiceInstance.id', 'subscription.id'])
      .first();
  },

  checkUserServiceIsInServiceInstance: async (
    userServiceId: UserServiceId,
    serviceInstanceId: ServiceInstanceId
  ) => {
    const userService =
      await UserServiceDomain.loadUserServiceById(userServiceId);
    return userService.subscription.service_instance_id === serviceInstanceId;
  },

  userHasBypassCapability: (user: UserLoadUserBy): boolean => {
    return (user.capabilities ?? []).some(
      (c) => c.name === CAPABILITY_BYPASS.name
    );
  },

  userHasPortalCapability: (
    user: UserLoadUserBy | undefined,
    requiredCapabilities: PortalCapability[]
  ): boolean => {
    if (!user) {
      return false;
    }
    if (AuthHelper.userHasBypassCapability(user)) {
      return true;
    }
    return (user.capabilities ?? []).some((c) =>
      requiredCapabilities.some((capability) => capability === c.name)
    );
  },

  getCapabilityUser: (user: UserLoadUserBy, args: ServiceCapabilityArgs) =>
    args.service_instance_id
      ? AuthHelper.loadCapabilitiesByServiceId(user, args.service_instance_id)
      : SubscriptionDomain.loadSubscriptionBy({
          id: args.subscription_id,
        } as SubscriptionMutator).then((subscription) => {
          if (!subscription) {
            throw new Error(ErrorCode.SubscriptionNotFound);
          }
          return AuthHelper.loadCapabilitiesByServiceId(
            user,
            subscription.service_instance_id
          );
        }),

  isUserAllowed: ({
    userCapabilities,
    organizationCapabilities,
    requiredCapability,
  }: {
    requiredCapability: OrganizationCapability;
    userCapabilities?: CapabilityPortal[];
    organizationCapabilities?: OrganizationCapability[];
  }): boolean => {
    const hasBypassCapability = (userCapabilities ?? []).some(
      (c) => c.name === CAPABILITY_BYPASS.name
    );
    if (hasBypassCapability) {
      return true;
    }

    const possibleCapabilities: string[] = [
      requiredCapability,
      OrganizationCapability.AdministrateOrganization,
    ];

    return (organizationCapabilities ?? []).some((organizationCapability) =>
      possibleCapabilities.includes(organizationCapability)
    );
  },

  isUserAllowedOnOrganization: async (
    user: UserLoadUserBy,
    {
      organizationId,
      requiredCapability,
    }: {
      organizationId: string;
      requiredCapability: OrganizationCapability;
    }
  ): Promise<{ isAllowed: boolean; isInOrganization: boolean }> => {
    // An API token reaches its own organization only: another one is answered as if the user were not a member
    if (!ApiTokenReach.allowsOrganization(organizationId)) {
      return { isAllowed: false, isInOrganization: false };
    }

    const organizationCapabilities =
      await UserOrganizationCapabilityDomain.loadUserOrganizationCapabilities(
        organizationId
      );

    const isAllowed = AuthHelper.isUserAllowed({
      requiredCapability: requiredCapability,
      userCapabilities: user.capabilities,
      // Only the capabilities the token kept: a token without the admin scope keeps none, not even
      // ADMINISTRATE_ORGANIZATION, which would otherwise allow every capability
      organizationCapabilities: ApiTokenReach.narrowCapabilities(
        organizationCapabilities.map(
          ({ name }) => name as OrganizationCapability
        )
      ),
    });

    if (isAllowed) {
      return {
        isAllowed,
        isInOrganization: true,
      };
    }

    const [userOrganization] =
      await UserOrganizationDomain.loadUserOrganization({
        user_id: user.id,
        organization_id: organizationId as OrganizationId,
      });

    return {
      isAllowed,
      isInOrganization: !!userOrganization,
    };
  },
};
