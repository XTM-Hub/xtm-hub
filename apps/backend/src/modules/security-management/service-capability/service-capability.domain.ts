import { db } from '../../../../knexfile';
import {
  ServiceRestriction,
  UserServiceCapability,
} from '../../../__generated__/resolvers-types';
import ServiceCapability, {
  ServiceCapabilityMutator,
} from '../../../model/kanel/public/ServiceCapability';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import UserService, {
  UserServiceId,
} from '../../../model/kanel/public/UserService';
import { UserLoadUserBy } from '../../../model/user';
import { restrictUserServiceToUserOrganization } from '../../../security/restriction/user-service';
import { addPrefixToObject } from '../../../utils/typescript';

export const ServiceCapabilityDomain = {
  loadServiceCapabilitiesBy: async (
    field:
      | addPrefixToObject<ServiceCapabilityMutator, 'Service_Capability.'>
      | ServiceCapabilityMutator
  ): Promise<ServiceCapability[]> => {
    return db<ServiceCapability>('Service_Capability')
      .where(field)
      .select('Service_Capability.*');
  },

  loadServiceCapabilitiesByServiceId: async (
    serviceInstanceId: ServiceInstanceId,
    user: UserLoadUserBy
  ): Promise<UserServiceCapability[]> => {
    const capabilitiesRows: {
      user_service_capability_id: string;
      user_service_id: string;
      generic_service_capability_id: string | null;
      generic_service_capability_name: string | null;
      subscription_capability_id: string | null;
      service_capability_id: string | null;
      service_capability_name: string | null;
    }[] = await db('UserService_Capability')
      .innerJoin(
        'User_Service',
        'UserService_Capability.user_service_id',
        '=',
        'User_Service.id'
      )
      .leftJoin(
        'Generic_Service_Capability',
        'UserService_Capability.generic_service_capability_id',
        '=',
        'Generic_Service_Capability.id'
      )
      .leftJoin(
        'Subscription_Capability',
        'UserService_Capability.subscription_capability_id',
        '=',
        'Subscription_Capability.id'
      )
      .leftJoin(
        'Service_Capability',
        'Subscription_Capability.service_capability_id',
        '=',
        'Service_Capability.id'
      )
      .innerJoin(
        'Subscription',
        'User_Service.subscription_id',
        '=',
        'Subscription.id'
      )
      .andWhere('Subscription.organization_id', user.selected_organization_id)
      .where('Subscription.service_instance_id', serviceInstanceId)
      .andWhere('User_Service.user_id', user.id)
      .select([
        'UserService_Capability.id as user_service_capability_id',
        'UserService_Capability.user_service_id',
        'Generic_Service_Capability.id as generic_service_capability_id',
        'Generic_Service_Capability.name as generic_service_capability_name',
        'Subscription_Capability.id as subscription_capability_id',
        'Service_Capability.id as service_capability_id',
        'Service_Capability.name as service_capability_name',
      ]);

    return capabilitiesRows.map((capabilityRow) => ({
      id: capabilityRow.user_service_capability_id,
      user_service_id: capabilityRow.user_service_id,
      generic_service_capability:
        capabilityRow.generic_service_capability_id &&
        capabilityRow.generic_service_capability_name
          ? {
              id: capabilityRow.generic_service_capability_id,
              name: capabilityRow.generic_service_capability_name,
            }
          : null,
      subscription_capability:
        capabilityRow.subscription_capability_id &&
        capabilityRow.service_capability_id &&
        capabilityRow.service_capability_name
          ? {
              id: capabilityRow.subscription_capability_id,
              service_capability: {
                id: capabilityRow.service_capability_id,
                name: capabilityRow.service_capability_name,
              },
            }
          : null,
    }));
  },

  getManageAccessLeft: async (userServiceId: UserServiceId) => {
    const userService = await db<UserService>('User_Service')
      .select('subscription_id')
      .tap(restrictUserServiceToUserOrganization)
      .where('User_Service.id', userServiceId)
      .first();

    if (!userService) {
      return false;
    }
    const result = await db<UserService>('User_Service')
      .tap(restrictUserServiceToUserOrganization)
      .leftJoin(
        'UserService_Capability',
        'User_Service.id',
        '=',
        'UserService_Capability.user_service_id'
      )
      .leftJoin(
        'Generic_Service_Capability',
        'UserService_Capability.generic_service_capability_id',
        '=',
        'Generic_Service_Capability.id'
      )
      .where('User_Service.subscription_id', userService.subscription_id)
      .andWhere(
        'Generic_Service_Capability.name',
        ServiceRestriction.ManageAccess
      )
      .countDistinct('User_Service.id as count')
      .first();

    return result.count !== '1';
  },
};
