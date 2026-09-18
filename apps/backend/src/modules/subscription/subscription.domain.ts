import { db, dbRaw, paginate, QueryOpts } from '../../../knexfile';
import {
  SubscriptionConnection,
  SubscriptionOrdering,
} from '../../__generated__/resolvers-types';
import { OrganizationId } from '../../model/kanel/public/Organization';
import ServiceCapability from '../../model/kanel/public/ServiceCapability';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
  SubscriptionInitializer,
  SubscriptionMutator,
} from '../../model/kanel/public/Subscription';
import SubscriptionCapability, {
  SubscriptionCapabilityId,
} from '../../model/kanel/public/SubscriptionCapability';
import UserService from '../../model/kanel/public/UserService';
import { restrictSubscriptionToUserOrganization } from '../../security/restriction/user-service';
import { UnknownErrorCode } from '../../utils/error/error.code';
import { formatRawObject } from '../../utils/query-raw.util';

export const SubscriptionDomain = {
  loadSubscriptions: async (opts: QueryOpts) => {
    const { filters, searchTerm, orderBy } = opts;
    const subscriptionOrderBy = getSubscriptionOrdering(orderBy);
    const normalizedSearchTerm = searchTerm?.trim();
    const orderingsRequiringServiceInstanceJoin = [
      SubscriptionOrdering.ServiceName,
      SubscriptionOrdering.ServiceDescription,
      SubscriptionOrdering.ServiceProvider,
      SubscriptionOrdering.ServiceType,
    ];
    const hasSearchTerm =
      normalizedSearchTerm !== undefined && normalizedSearchTerm.length > 0;
    const shouldJoinOrganization =
      hasSearchTerm ||
      subscriptionOrderBy === SubscriptionOrdering.OrganizationName;
    const shouldJoinServiceInstanceAndDefinition =
      hasSearchTerm ||
      orderingsRequiringServiceInstanceJoin.includes(subscriptionOrderBy);

    const queryContext = buildLoadSubscriptionsQuery({
      normalizedSearchTerm,
      shouldJoinOrganization,
      shouldJoinServiceInstanceAndDefinition,
    });

    return paginate<Subscription, SubscriptionConnection>(
      'Subscription',
      {
        ...opts,
        orderBy: mapSubscriptionOrderingToColumn(subscriptionOrderBy),
        filters,
        searchTerm: undefined,
      },
      {},
      queryContext
    );
  },

  deleteSubscriptions: async (
    ids: SubscriptionId[]
  ): Promise<Subscription[]> => {
    return db<Subscription>('Subscription').whereIn('id', ids).delete('*');
  },

  loadSubscriptionCapabilitiesBySubscriptionIds: async (
    ids: SubscriptionId[]
  ): Promise<SubscriptionCapability[]> => {
    if (ids.length === 0) {
      return [];
    }

    return db<SubscriptionCapability>('Subscription_Capability')
      .whereIn('Subscription_Capability.subscription_id', ids)
      .select('Subscription_Capability.*');
  },

  loadUserServicesBySubscriptionIds: (
    ids: SubscriptionId[]
  ): Promise<UserService[]> => {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }

    return db<UserService>('User_Service')
      .tap(restrictSubscriptionToUserOrganization)
      .whereIn('User_Service.subscription_id', ids)
      .select('User_Service.*');
  },

  loadServiceCapabilitiesBySubscriptionCapabilityIds: async (
    ids: SubscriptionCapabilityId[]
  ): Promise<
    (ServiceCapability & { subscription_capability_id: string })[]
  > => {
    if (ids.length === 0) {
      return [];
    }

    return db<ServiceCapability>('Service_Capability')
      .leftJoin(
        'Subscription_Capability',
        'Subscription_Capability.service_capability_id',
        '=',
        'Service_Capability.id'
      )
      .whereIn('Subscription_Capability.id', ids)
      .select([
        'Service_Capability.*',
        'Subscription_Capability.id as subscription_capability_id',
      ]);
  },

  transferSubscriptionToOrganization: async ({
    subscriptionId,
    organizationId,
  }: {
    subscriptionId: SubscriptionId;
    organizationId: OrganizationId;
  }) => {
    return db<Subscription>('Subscription')
      .update({ organization_id: organizationId })
      .where({ id: subscriptionId });
  },

  createSubscription: async (
    data: SubscriptionInitializer
  ): Promise<Subscription> => {
    const [createdSubscription] = await db<Subscription>('Subscription')
      .insert(data)
      .returning('*');
    if (!createdSubscription) {
      throw new Error(UnknownErrorCode.ServiceSubscriptionError);
    }
    return createdSubscription;
  },

  loadSubscriptionBy: async (
    field: SubscriptionMutator
  ): Promise<Subscription | undefined> => {
    return db<Subscription>('Subscription').where(field).first();
  },

  loadSubscriptionsByIds: async (
    ids: SubscriptionId[]
  ): Promise<Subscription[]> => {
    return db<Subscription>('Subscription').whereIn('id', ids);
  },

  loadSubscriptionsByOrganizationAndServiceInstanceIds: async ({
    organizationIds,
    serviceInstanceIds,
  }: {
    organizationIds: OrganizationId[];
    serviceInstanceIds: ServiceInstanceId[];
  }): Promise<Subscription[]> => {
    if (organizationIds.length === 0 || serviceInstanceIds.length === 0) {
      return [];
    }

    return db<Subscription>('Subscription')
      .whereIn('organization_id', organizationIds)
      .whereIn('service_instance_id', serviceInstanceIds);
  },

  updateSubscriptionBy: async (
    field: SubscriptionMutator,
    data: SubscriptionMutator
  ): Promise<Subscription[]> => {
    return db<Subscription>('Subscription')
      .where(field)
      .update(data)
      .returning('*');
  },

  loadSubscriptionWithOrganizationAndCapabilitiesBy: async (
    field: SubscriptionMutator
  ) => {
    return db<Subscription>('Subscription')
      .where(field)
      .leftJoin(
        'Organization',
        'Organization.id',
        '=',
        'Subscription.organization_id'
      )
      .leftJoin(
        'ServiceInstance',
        'ServiceInstance.id',
        '=',
        'Subscription.service_instance_id'
      )
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .leftJoin(
        'Service_Capability',
        'Service_Capability.service_definition_id',
        '=',
        'ServiceDefinition.id'
      )
      .leftJoin(
        'Subscription_Capability',
        'Subscription_Capability.subscription_id',
        '=',
        'Subscription.id'
      )
      .select([
        'Subscription.*',
        dbRaw(
          formatRawObject({
            columnName: 'Organization',
            typename: 'Organization',
            as: 'organization',
          })
        ),
        dbRaw(
          `
     
            json_build_object(
                'id', "ServiceInstance".id, 
                'name', "ServiceInstance".name, 
                'description', "ServiceInstance".description,
         
                'service_definition', 
                  json_build_object(
                  'id', "ServiceDefinition".id,
                    'service_capability', 
                        json_agg(json_build_object(
                          'id', "Service_Capability".id, 
                          'name', "Service_Capability".name, 
                          'description', "Service_Capability".description, 
                          '__typename', 'Service_Capability'
                        )), 
                  '__typename', 'ServiceDefinition'
                  ), 
                '__typename', 'ServiceInstance'
            
        
    ) AS service_instance`
        ),
        dbRaw(
          `COALESCE(
        json_agg(
            json_build_object(
                'id', "Subscription_Capability".id, 
                'service_capability_id', "Subscription_Capability".service_capability_id, 
                'service_capability', json_build_object(
                    'id', "Service_Capability".id, 
                    'name', "Service_Capability".name, 
                    'description', "Service_Capability".description, 
                    '__typename', 'Service_Capability'
                ), 
                '__typename', 'Subscription_Capability'
            )
        ) FILTER (WHERE "Subscription_Capability".id IS NOT NULL),
        '[]'::json
    ) AS subscription_capability`
        ),
      ])
      .groupBy([
        'Subscription.id',
        'Organization.id',
        'ServiceInstance.id',
        'ServiceDefinition.id',
        'Service_Capability.id',
      ]);
  },
};

const buildLoadSubscriptionsQuery = ({
  normalizedSearchTerm,
  shouldJoinOrganization,
  shouldJoinServiceInstanceAndDefinition,
}: {
  normalizedSearchTerm: string | undefined;
  shouldJoinOrganization: boolean;
  shouldJoinServiceInstanceAndDefinition: boolean;
}) => {
  const queryContext = db<Subscription>('Subscription');

  if (shouldJoinOrganization) {
    queryContext.leftJoin(
      'Organization',
      'Organization.id',
      'Subscription.organization_id'
    );
  }

  if (shouldJoinServiceInstanceAndDefinition) {
    queryContext
      .leftJoin(
        'ServiceInstance',
        'ServiceInstance.id',
        'Subscription.service_instance_id'
      )
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        'ServiceInstance.service_definition_id'
      );
  }

  if (normalizedSearchTerm) {
    queryContext.andWhere((qb) => {
      qb.whereILike('Organization.name', `%${normalizedSearchTerm}%`)
        .orWhereILike('ServiceInstance.name', `%${normalizedSearchTerm}%`)
        .orWhereILike(
          'ServiceDefinition.identifier',
          `%${normalizedSearchTerm}%`
        )
        .orWhereILike(
          'ServiceInstance.creation_status',
          `%${normalizedSearchTerm}%`
        )
        .orWhereRaw(
          `EXISTS (
            SELECT 1
            FROM unnest("ServiceInstance"."tags"::text[]) AS tag
            WHERE LOWER(tag) = LOWER(?)
          )`,
          [normalizedSearchTerm]
        );
    });
  }

  return queryContext;
};

const subscriptionOrderings = new Set(Object.values(SubscriptionOrdering));
const getSubscriptionOrdering = (
  orderBy: string | null | undefined
): SubscriptionOrdering => {
  if (orderBy && subscriptionOrderings.has(orderBy as SubscriptionOrdering)) {
    return orderBy as SubscriptionOrdering;
  }
  return SubscriptionOrdering.StartDate;
};

const SUBSCRIPTION_ORDERING_TO_COLUMN: Record<SubscriptionOrdering, string> = {
  [SubscriptionOrdering.OrganizationName]: 'Organization.name',
  [SubscriptionOrdering.StartDate]: 'Subscription.start_date',
  [SubscriptionOrdering.EndDate]: 'Subscription.end_date',
  [SubscriptionOrdering.ServiceName]: 'ServiceInstance.name',
  [SubscriptionOrdering.ServiceDescription]: 'ServiceDefinition.description',
  [SubscriptionOrdering.ServiceType]: 'ServiceDefinition.identifier',
  [SubscriptionOrdering.ServiceProvider]: 'ServiceDefinition.name',
};

const mapSubscriptionOrderingToColumn = (
  orderBy: SubscriptionOrdering
): string => {
  return SUBSCRIPTION_ORDERING_TO_COLUMN[orderBy] ?? 'Subscription.start_date';
};
