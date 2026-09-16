import { v4 as uuidv4 } from 'uuid';
import { db, dbRaw, paginate, QueryOpts } from '../../../knexfile';
import {
  ServiceRestriction,
  SubscriptionModel,
  UserServiceCapability,
  UserServiceConnection,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import { requestContext } from '../../context/request.context';
import { GenericServiceCapabilityId } from '../../model/kanel/public/GenericServiceCapability';
import DBSubscriptionModel, {
  SubscriptionId,
} from '../../model/kanel/public/Subscription';
import { UserId } from '../../model/kanel/public/User';
import UserService, {
  UserServiceId,
  UserServiceInitializer,
  UserServiceMutator,
} from '../../model/kanel/public/UserService';
import {
  UserServiceCapabilityId,
  UserServiceCapabilityInitializer,
} from '../../model/kanel/public/UserServiceCapability';
import { isUserAdminPlatform } from '../../security/access';
import { restrictSubscriptionToUserOrganization } from '../../security/restriction/user-service';
import { buildServiceLink, sendMail } from '../../server/mail-service';
import { ServiceIdentifierToMailTemplate } from '../../server/mail-template/mail';
import {
  ErrorCode,
  NotFoundErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { formatRawObject } from '../../utils/query-raw.util';
import { addPrefixToObject } from '../../utils/typescript';
import { UserDomain } from '../organization-management/user/user-domain/user.domain';
import { UserOrganizationDomain } from '../organization-management/user/user-organization/user-organization.domain';
import { UserProvisioningApp } from '../organization-management/user/user-provisioning/user-provisioning.app';
import { UserHelper } from '../organization-management/user/user.helper';
import { GenericServiceCapabilityIds } from '../security-management/service-capability/generic-service-capability.const';
import { UserServiceCapabilityHelper } from '../security-management/user-service-capability/user-service-capability.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';

export const UserServiceDomain = {
  addServiceToUsers: async (
    subscription: DBSubscriptionModel,
    emails: string[],
    capabilities: string[]
  ): Promise<UserService[]> => {
    const userServices: UserService[] = [];
    return withTransaction(async () => {
      for (const email of emails) {
        const user = await UserProvisioningApp.getOrProvisionUser({
          email: email,
        });

        await UserHelper.insertUserIntoOrganization(user, subscription.id);
        const userServiceAlreadyExist =
          await UserServiceDomain.doesUserServiceExist(
            user.id as UserId,
            subscription.id
          );

        if (!userServiceAlreadyExist) {
          const createdUserService =
            await UserServiceDomain.createUserServiceAccess({
              subscription_id: subscription.id,
              user_id: user.id as UserId,
              capabilities: capabilities,
            });
          userServices.push(createdUserService);
        }
      }
      return userServices;
    });
  },

  createUserServiceAccess: async ({
    subscription_id,
    user_id,
    capabilities,
  }: {
    subscription_id: SubscriptionId;
    user_id: UserId;
    capabilities: string[];
  }) => {
    const user_service: UserServiceInitializer = {
      id: uuidv4() as UserServiceId,
      subscription_id,
      user_id,
    };

    // Check the user is in the current organization
    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      id: subscription_id as SubscriptionId,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }
    const userOrganizations = await UserOrganizationDomain.loadUserOrganization(
      {
        user_id,
      }
    );
    if (
      !userOrganizations.some(
        (userOrganization) =>
          userOrganization.organization_id === subscription.organization_id
      )
    ) {
      throw new Error(ErrorCode.UserIsNotInOrganization);
    }
    const addedUserService = await withTransaction(async () => {
      const [addedUserService] = await db<UserService>('User_Service')
        .insert(user_service)
        .returning('*');

      if (!addedUserService) {
        throw new Error(UnknownErrorCode.AddUserServiceError);
      }

      await UserServiceCapabilityHelper.insertCapabilities(capabilities, [
        addedUserService,
      ]);
      const user_service_capa: UserServiceCapabilityInitializer = {
        id: uuidv4() as UserServiceCapabilityId,
        user_service_id: addedUserService.id,
        generic_service_capability_id:
          GenericServiceCapabilityIds.AccessId as GenericServiceCapabilityId,
        subscription_capability_id: null,
      };
      await UserServiceCapabilityHelper.insertUserServiceCapability([
        user_service_capa,
      ]);
      return addedUserService;
    });

    const user = await UserDomain.loadUserBy({ 'User.id': user_id });
    if (!user) {
      throw new Error(ErrorCode.UserNotFound);
    }
    const serviceInstance = await ServiceInstanceDomain.loadServiceInstanceBy({
      id: subscription.service_instance_id,
    });
    if (!serviceInstance) {
      throw new Error(NotFoundErrorCode.ServiceInstanceNotFound);
    }
    const serviceDefinition =
      await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
        serviceInstance.id
      );
    if (!serviceDefinition) {
      throw new Error(NotFoundErrorCode.ServiceDefinitionNotFound);
    }
    const mailTemplate = ServiceIdentifierToMailTemplate.get(
      serviceDefinition.identifier
    );
    if (mailTemplate) {
      await sendMail({
        to: user.email,
        template: mailTemplate,
        params: {
          name: user.email,
          serviceLink: buildServiceLink({
            serviceDefinitionIdentifier: serviceDefinition.identifier,
            serviceInstanceId: serviceInstance.id,
          }),
          serviceName: serviceInstance.name,
        },
      });
    }
    return addedUserService;
  },

  insertUserService: async (
    userServiceData: UserServiceInitializer | UserServiceInitializer[]
  ): Promise<UserService[]> => {
    return db<UserService>('User_Service')
      .insert(userServiceData)
      .returning('*');
  },

  loadUserServiceBy: async (
    field:
      | addPrefixToObject<UserServiceMutator, 'User_Service.'>
      | UserServiceMutator
  ): Promise<UserService[]> => {
    return db<UserService>('User_Service').where(field);
  },

  loadUserServiceWithSubscriptionBy: async (
    field:
      | addPrefixToObject<UserServiceMutator, 'User_Service.'>
      | UserServiceMutator
  ) => {
    return db<UserService>('User_Service')
      .where(field)
      .leftJoin(
        'Subscription',
        'User_Service.subscription_id',
        'Subscription.id'
      )
      .leftJoin(
        'UserService_Capability',
        'User_Service.id',
        'UserService_Capability.user_service_id'
      )
      .select('*');
  },

  loadUserServicesByIds: async (
    ids: UserServiceId[]
  ): Promise<UserService[]> => {
    return db<UserService[]>('User_Service').whereIn('id', ids).select('*');
  },

  loadUserServiceWithCapabilitiesBy: async (field: UserServiceMutator) => {
    const queryUserServiceCapabilities = db<UserServiceCapability>(
      'UserService_Capability'
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
      .select(
        'UserService_Capability.user_service_id',
        dbRaw(
          `json_agg(
        CASE
        WHEN "Generic_Service_Capability".id IS NOT NULL THEN
        json_build_object(
          'id', "UserService_Capability".id,
          'user_service_id', "UserService_Capability".user_service_id,
          'generic_service_capability', json_build_object(
            'id', "Generic_Service_Capability".id,
            'name', "Generic_Service_Capability".name,
            '__typename', 'Generic_Service_Capability'
          ),
          '__typename', 'UserServiceCapability'
        )
        WHEN "Service_Capability".id IS NOT NULL THEN
        json_build_object(
          'id', "UserService_Capability".id,
          'user_service_id', "UserService_Capability".user_service_id,
          'subscription_capability', json_build_object(
            'id', "Subscription_Capability".id,
            'service_capability', json_build_object(
            'id', "Service_Capability".id,
            'name', "Service_Capability".name,
            '__typename', 'Service_Capability'
            ),
            '__typename', 'Subscription_Capability'
          ),
          '__typename', 'UserServiceCapability'
        )
        ELSE NULL
        END
      ) FILTER (WHERE "Generic_Service_Capability".id IS NOT NULL OR "Service_Capability".id IS NOT NULL) AS capabilities`
        )
      )

      .groupBy('UserService_Capability.user_service_id')
      .as('userServiceCapabilities');

    const query = db<UserService>('User_Service')
      .select(
        'User_Service.*',
        dbRaw(
          `COALESCE("userServiceCapabilities".capabilities, '[]'::json) as user_service_capability`
        ),
        dbRaw(
          `json_build_object(
          'id', "ServiceInstance".id,
          '__typename', 'ServiceInstance'
        ) AS service`
        )
      )
      .leftJoin(
        queryUserServiceCapabilities,
        'User_Service.id',
        '=',
        'userServiceCapabilities.user_service_id'
      )
      .leftJoin(
        'Subscription',
        'Subscription.id',
        '=',
        'User_Service.subscription_id'
      )
      .leftJoin(
        'ServiceInstance',
        'ServiceInstance.id',
        '=',
        'Subscription.service_instance_id'
      );

    if (field) {
      query.where(field);
    }

    return query;
  },

  loadSubscriptionByUserService: async (
    id: UserServiceId
  ): Promise<SubscriptionModel | undefined> => {
    return db<DBSubscriptionModel>('User_Service')
      .tap(restrictSubscriptionToUserOrganization)
      .where('User_Service.id', id)
      .leftJoin(
        'Subscription',
        'User_Service.subscription_id',
        '=',
        'Subscription.id'
      )
      .select('Subscription.*')
      .first();
  },

  loadUserServiceById: async (userServiceId: UserServiceId) => {
    return db<UserService>('User_Service')
      .where('User_Service.id', '=', userServiceId)
      .leftJoin(
        'Subscription as sub',
        'User_Service.subscription_id',
        '=',
        'sub.id'
      )
      .leftJoin(
        'UserService_Capability as userServiceCapa',
        'User_Service.id',
        '=',
        'userServiceCapa.user_service_id'
      )
      .leftJoin(
        'Generic_Service_Capability as genericServCapa',
        'userServiceCapa.generic_service_capability_id',
        '=',
        'genericServCapa.id'
      )
      .leftJoin(
        'ServiceInstance as service',
        'sub.service_instance_id',
        '=',
        'service.id'
      )
      .leftJoin('User as user', 'User_Service.user_id', '=', 'user.id')
      .select([
        'User_Service.*',
        dbRaw(
          "(json_agg(json_build_object('id', \"user\".id,'last_name', \"user\".last_name, 'first_name', \"user\".first_name,  'email', \"user\".email, '__typename', 'User')) ->> 0)::json as user"
        ),
        dbRaw(
          "(json_agg(json_build_object('id', \"sub\".id,'service_instance_id', \"sub\".service_instance_id, 'service_instance', json_build_object('id', \"service\".id,'name', \"service\".name,'__typename', 'ServiceInstance'), '__typename', 'Subscription')) ->> 0)::json as subscription"
        ),
        dbRaw(
          "(json_agg(json_build_object('id', \"userServiceCapa\".id, 'generic_service_capability', json_build_object('id', \"genericServCapa\".id, 'name', \"genericServCapa\".name, '__typename', 'Generic_Service_Capability'), '__typename', 'UserService_Capability'))) as user_service_capability"
        ),
      ])
      .groupBy(['User_Service.id'])
      .first();
  },

  loadUserServiceGenericCapability: async (
    userId: UserId,
    subscriptionId: SubscriptionId,
    capability: ServiceRestriction
  ) => {
    return db<UserService>('User_Service')
      .leftJoin(
        'UserService_Capability',
        'User_Service.id',
        'UserService_Capability.user_service_id'
      )
      .leftJoin(
        'Generic_Service_Capability',
        'Generic_Service_Capability.id',
        'UserService_Capability.generic_service_capability_id'
      )
      .where({
        user_id: userId,
        'User_Service.subscription_id': subscriptionId,
        'Generic_Service_Capability.name': capability,
      })
      .first();
  },

  loadUserServiceCapabilities: async (userServiceId: UserServiceId) => {
    const initialQuery = db<UserServiceCapability>('User_Service').where(
      'User_Service.id',
      userServiceId
    );
    const generic_service_capabilities = await initialQuery
      .clone()
      .leftJoin(
        'UserService_Capability as userServcapa',
        'User_Service.id',
        '=',
        'userServcapa.user_service_id'
      )
      .leftJoin(
        'Generic_Service_Capability as genericservcapa',
        'userServcapa.generic_service_capability_id',
        '=',
        'genericservcapa.id'
      )
      .whereNotNull('genericservcapa.id')
      .select(['userServcapa.id as userServcapaId', 'genericservcapa.*']);

    const subscription_capabilities = await initialQuery
      .clone()
      .leftJoin(
        'UserService_Capability as userServcapa',
        'User_Service.id',
        '=',
        'userServcapa.user_service_id'
      )
      .leftJoin(
        'Subscription_Capability',
        'userServcapa.subscription_capability_id',
        '=',
        'Subscription_Capability.id'
      )
      .leftJoin(
        'Service_Capability',
        'Subscription_Capability.service_capability_id',
        '=',
        'Service_Capability.id'
      )
      .whereNotNull('Service_Capability.id')
      .select([
        'userServcapa.id as userServcapaId',
        'Subscription_Capability.id as subscriptionCapaId',
        'Service_Capability.*',
      ]);

    const userServiceCapability = [
      ...generic_service_capabilities.map(
        ({
          userServcapaId,
          ...generic_service_capability
        }: {
          userServcapaId: string;
          [key: string]: unknown;
        }) => ({
          id: userServcapaId,
          user_service_id: userServiceId,
          generic_service_capability: {
            ...generic_service_capability,
            __typename: 'Generic_Service_Capability',
          },
        })
      ),
      ...subscription_capabilities.map(
        ({
          userServcapaId,
          subscriptionCapaId,
          ...service_capability
        }: {
          userServcapaId: string;
          subscriptionCapaId: string;
          [key: string]: unknown;
        }) => ({
          id: userServcapaId,
          user_service_id: userServiceId,
          subscription_capability: {
            id: subscriptionCapaId,
            service_capability: {
              ...service_capability,
              __typename: 'Service_Capability',
            },
            __typename: 'Subscription_Capability',
          },
        })
      ),
    ];
    return userServiceCapability.length > 0 ? userServiceCapability : undefined;
  },

  loadUserServiceBySubscription: (
    opts: QueryOpts,
    subscriptionId: SubscriptionId
  ) => {
    const user = requestContext.requireUser();
    const userServiceQuery = db<UserService>('User_Service')
      .where('subscription_id', '=', subscriptionId)
      .leftJoin('User as user', 'User_Service.user_id', '=', 'user.id')
      .select([
        'User_Service.*',
        dbRaw(
          formatRawObject({
            columnName: 'user',
            typename: 'User',
            as: 'user',
          })
        ),
      ]);

    if (!isUserAdminPlatform(user)) {
      userServiceQuery.tap(restrictSubscriptionToUserOrganization);
    }

    return paginate<UserService, UserServiceConnection>(
      'User_Service',
      opts,
      undefined,
      userServiceQuery
    );
  },

  deleteUserServices: async (
    ids: UserServiceId[]
  ): Promise<UserService[] | null> => {
    return db<UserService>('User_Service').whereIn('id', ids).delete('*');
  },

  deleteUserCapabilityById: async (userServiceId: UserServiceId) => {
    await db<UserServiceCapability>('UserService_Capability')
      .where('user_service_id', '=', userServiceId)
      .delete('*');
  },

  doesUserServiceExist: async (
    user_id: UserId,
    subscription_id: SubscriptionId
  ): Promise<boolean> => {
    const existingUserService = await db<UserService>('User_Service')
      .where({ user_id, subscription_id })
      .select('User_Service.id')
      .first();
    return !!existingUserService;
  },
};
