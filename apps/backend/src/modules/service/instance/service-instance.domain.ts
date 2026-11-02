import { v4 as uuidv4 } from 'uuid';
import { db, dbRaw, paginate, QueryOpts } from '../../../../knexfile';
import {
  PlatformIdentifier,
  SeoServiceInstance,
  ServiceConnection,
  ServiceDefinition,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
  ServiceInstanceTag,
  ServiceLink,
} from '../../../__generated__/resolvers-types';
import { requestContext } from '../../../context/request.context';
import Organization, {
  OrganizationId,
} from '../../../model/kanel/public/Organization';
import {
  default as PlatformConfigurationModel,
  PlatformConfigurationMutator,
} from '../../../model/kanel/public/PlatformConfiguration';
import { ServiceDefinitionId } from '../../../model/kanel/public/ServiceDefinition';
import ServiceInstance, {
  ServiceInstanceId,
  ServiceInstanceInitializer,
  ServiceInstanceMutator,
} from '../../../model/kanel/public/ServiceInstance';
import Subscription from '../../../model/kanel/public/Subscription';
import { UserId } from '../../../model/kanel/public/User';
import { isUserAdminPlatform } from '../../../security/access';
import {
  restrictServiceInstanceToAccessible,
  restrictServiceInstanceToPublic,
} from '../../../security/restriction/service-instance';
import { buildTupleFilter } from '../../../utils/batch-query.util';
import { UnknownErrorCode } from '../../../utils/error/error.code';
import { formatRawObject } from '../../../utils/query-raw.util';
import {
  serviceInstanceNameMappedByPlatformIdentifier,
  serviceInstanceTagMappedByPlatformIdentifier,
} from '../../registration/registration.mapping';

export const ServiceInstanceDomain = {
  createPlatformServiceInstance: async (
    serviceDefinitionId: ServiceDefinitionId,
    platformIdentifier: PlatformIdentifier,
    creation_status: ServiceInstanceCreationStatus = ServiceInstanceCreationStatus.Ready
  ): Promise<ServiceInstanceId> => {
    const id = uuidv4() as ServiceInstanceId;
    await db('ServiceInstance').insert([
      {
        id,
        name: serviceInstanceNameMappedByPlatformIdentifier[platformIdentifier],
        description: '',
        creation_status,
        public: false,
        tags: [
          serviceInstanceTagMappedByPlatformIdentifier[platformIdentifier],
        ],
        service_definition_id: serviceDefinitionId,
      },
    ]);

    return id;
  },
  loadServiceInstancesByServiceDefinitionAndTagsWithoutSubscription: async (
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier,
    tags: ServiceInstanceTag[]
  ): Promise<SeoServiceInstance[]> => {
    return db<ServiceInstance>('ServiceInstance')
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .leftJoin(
        'Subscription',
        'Subscription.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .leftJoin(
        'Service_Link',
        'Service_Link.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .whereNull('Subscription.id')
      .andWhereRaw(
        `"ServiceInstance"."tags"::text[] @> ARRAY[${tags.map(() => '?').join(', ')}]::text[]`,
        tags
      )
      .andWhere(
        'ServiceDefinition.identifier',
        '=',
        serviceDefinitionIdentifier
      )
      .select(
        'ServiceInstance.id',
        'ServiceInstance.name',
        'ServiceInstance.slug',
        'ServiceInstance.description',
        'ServiceInstance.logo_document_id',
        'ServiceInstance.illustration_document_id',
        'ServiceInstance.tags',
        'ServiceInstance.ordering',
        dbRaw(
          formatRawObject({
            columnName: 'ServiceDefinition',
            typename: 'ServiceDefinition',
            as: 'service_definition',
          })
        ),
        dbRaw('json_agg("Service_Link") AS links')
      )
      .groupBy('ServiceInstance.id', 'ServiceDefinition.id');
  },

  loadSubscribedServiceInstancesByIdentifier: async (
    user_id: UserId,
    identifier: string
  ) => {
    const subServiceInstance = await db<ServiceInstance>('ServiceInstance')
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .leftJoin(
        'Subscription',
        'Subscription.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .leftJoin(
        'Organization',
        'Organization.id',
        '=',
        'Subscription.organization_id'
      )
      .leftJoin(
        'User_Organization',
        'User_Organization.organization_id',
        '=',
        'Organization.id'
      )
      .leftJoin(
        'Subscription AS Organization_Subscriptions',
        'Organization_Subscriptions.organization_id',
        '=',
        'Organization.id'
      )
      .leftJoin(
        'PlatformConfiguration',
        'PlatformConfiguration.service_instance_id',
        '=',
        'Organization_Subscriptions.service_instance_id'
      )
      .where('User_Organization.user_id', user_id)
      .where('ServiceDefinition.identifier', identifier)
      .groupBy(['ServiceInstance.id', 'Organization.id'])
      .select([
        'ServiceInstance.id AS service_instance_id',
        'Organization.id AS organization_id',
        'Organization.personal_space AS is_personal_space',
        dbRaw(
          `COALESCE(
            json_agg(
              jsonb_build_object(
                'registerer_id', "PlatformConfiguration"."registerer_id",
                'platform_id', "PlatformConfiguration"."platform_id",
                'tenant_id', "PlatformConfiguration"."tenant_id",
                'tenant_name', "PlatformConfiguration"."tenant_name",
                'platform_url', "PlatformConfiguration"."platform_url",
                'platform_title', "PlatformConfiguration"."platform_title",
                'platform_version', "PlatformConfiguration"."platform_version",
                'platform_contract', "PlatformConfiguration"."platform_contract",
                'token', "PlatformConfiguration"."token"
              )
            ) FILTER (WHERE "PlatformConfiguration"."service_instance_id" IS NOT NULL),
            '[]'::json
          ) AS configurations`
        ),
      ]);

    return subServiceInstance.map((sub) => ({
      ...sub,
      configurations: sub.configurations.filter(
        (config: PlatformConfigurationModel) => !!config
      ),
    }));
  },

  loadIsSubscribedByKeys: async (
    keys: readonly {
      organizationId: OrganizationId;
      serviceInstanceId: ServiceInstanceId;
    }[]
  ): Promise<
    Pick<Subscription, 'organization_id' | 'service_instance_id'>[]
  > => {
    const { columns, tuples } = buildTupleFilter(keys, [
      {
        column: 'Subscription.organization_id',
        value: (key) => key.organizationId,
      },
      {
        column: 'Subscription.service_instance_id',
        value: (key) => key.serviceInstanceId,
      },
    ]);

    if (tuples.length === 0) {
      return [];
    }

    return db<Subscription>('Subscription')
      .whereIn(columns, tuples)
      .select(
        'Subscription.organization_id',
        'Subscription.service_instance_id'
      );
  },

  loadServiceInstances: async (
    opts: QueryOpts & { includeInaccessible?: boolean | null }
  ) => {
    const { filters, searchTerm, orderBy, includeInaccessible } = opts;
    const user = requestContext.get()?.user;
    const showEveryServiceInstance =
      !!includeInaccessible && !!user && isUserAdminPlatform(user);

    return paginate<ServiceInstance, ServiceConnection>(
      'ServiceInstance',
      {
        ...opts,
        orderBy: `ServiceInstance.${orderBy}`,
        filters,
        searchTerm,
      },
      undefined,
      db<ServiceInstance>('ServiceInstance').modify((queryBuilder) => {
        if (!showEveryServiceInstance) {
          restrictServiceInstanceToAccessible(queryBuilder);
        }
      })
    );
  },

  loadServiceInstanceSubscriptionsByIds: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<(Subscription & { organization: Organization | null })[]> => {
    if (ids.length === 0) {
      return [];
    }

    const user = requestContext.requireUser();

    const queryBuilder = db<Subscription>('Subscription')
      .whereIn('Subscription.service_instance_id', ids)
      .leftJoin(
        'Organization',
        'Organization.id',
        'Subscription.organization_id'
      );

    if (!isUserAdminPlatform(user)) {
      queryBuilder.where(
        'Subscription.organization_id',
        '=',
        user.selected_organization_id
      );
    }

    return queryBuilder.select([
      'Subscription.*',
      dbRaw(
        formatRawObject({
          columnName: 'Organization',
          typename: 'Organization',
          as: 'organization',
        })
      ),
    ]);
  },

  loadServiceInstanceSubscriptions: async (id: ServiceInstanceId) => {
    return ServiceInstanceDomain.loadServiceInstanceSubscriptionsByIds([id]);
  },

  loadSubscriptionByServiceInstanceAndOrganization: async (
    selectedOrganizationId: OrganizationId,
    id: ServiceInstanceId
  ) => {
    return db<Subscription>('Subscription')
      .where('Subscription.service_instance_id', '=', id)
      .where('Subscription.organization_id', '=', selectedOrganizationId)
      .leftJoin(
        'Organization',
        'Organization.id',
        'Subscription.organization_id'
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
      ])
      .first();
  },

  loadJoinedUserServiceKeys: async (
    keys: readonly {
      userId: UserId;
      organizationId: OrganizationId;
      serviceInstanceId: ServiceInstanceId;
    }[]
  ): Promise<
    {
      service_instance_id: ServiceInstanceId;
      organization_id: OrganizationId;
      user_id: UserId;
    }[]
  > => {
    const { columns, tuples } = buildTupleFilter(keys, [
      {
        column: 'Subscription.service_instance_id',
        value: (key) => key.serviceInstanceId,
      },
      {
        column: 'Subscription.organization_id',
        value: (key) => key.organizationId,
      },
      { column: 'User_Service.user_id', value: (key) => key.userId },
    ]);

    if (tuples.length === 0) {
      return [];
    }

    return db<Subscription>('Subscription')
      .join(
        'User_Service',
        'User_Service.subscription_id',
        '=',
        'Subscription.id'
      )
      .whereIn(columns, tuples)
      .select(
        'Subscription.service_instance_id',
        'Subscription.organization_id',
        'User_Service.user_id'
      );
  },

  getUserJoined: async (
    userId: UserId,
    organizationId: OrganizationId,
    id: ServiceInstanceId
  ) => {
    const joined = await ServiceInstanceDomain.loadJoinedUserServiceKeys([
      { userId, organizationId, serviceInstanceId: id },
    ]);
    return joined.length > 0;
  },

  loadServiceInstanceBy: async (
    field: ServiceInstanceMutator,
    searchTerm?: string
  ): Promise<ServiceInstance | undefined> => {
    const query = db<ServiceInstance>('ServiceInstance')
      .where(field)
      .modify((queryBuilder) => {
        if (searchTerm) {
          queryBuilder.where('org.name', 'ILIKE', `%${searchTerm}%`);
        }
      });

    return query.select('ServiceInstance.*').first();
  },

  loadAccessibleServiceInstanceBy: async (
    field: ServiceInstanceMutator
  ): Promise<ServiceInstance | undefined> => {
    return db<ServiceInstance>('ServiceInstance')
      .where(field)
      .tap(restrictServiceInstanceToAccessible)
      .select('ServiceInstance.*')
      .first();
  },

  loadServiceInstancesByIds: async (
    ids: ServiceInstanceId[]
  ): Promise<ServiceInstance[]> => {
    if (ids.length === 0) {
      return [];
    }

    return db<ServiceInstance>('ServiceInstance').whereIn(
      'ServiceInstance.id',
      ids
    );
  },

  loadLinksByServiceInstanceIds: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<ServiceLink[]> => {
    if (ids.length === 0) {
      return [];
    }

    return db<ServiceLink>('Service_Link')
      .whereIn('Service_Link.service_instance_id', ids)
      .select(['*']);
  },

  loadLinks: async (id: ServiceInstanceId) => {
    return ServiceInstanceDomain.loadLinksByServiceInstanceIds([id]);
  },

  loadServiceDefinitionsByServiceInstanceIds: async (
    ids: readonly ServiceInstanceId[]
  ): Promise<
    (ServiceDefinition & { service_instance_id: ServiceInstanceId })[]
  > => {
    if (ids.length === 0) {
      return [];
    }

    return db<ServiceDefinition>('ServiceInstance')
      .whereIn('ServiceInstance.id', ids)
      .leftJoin(
        'ServiceDefinition as service_def',
        'service_def.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .select('service_def.*', 'ServiceInstance.id as service_instance_id');
  },

  loadServiceDefinitionByServiceInstance: async (
    service_instance_id: ServiceInstanceId
  ): Promise<ServiceDefinition | undefined> => {
    const [serviceDefinition] =
      await ServiceInstanceDomain.loadServiceDefinitionsByServiceInstanceIds([
        service_instance_id,
      ]);
    return serviceDefinition;
  },

  loadSeoServiceInstances: async (): Promise<SeoServiceInstance[]> => {
    return db<ServiceInstance>('ServiceInstance')
      .leftJoin(
        'Service_Link',
        'Service_Link.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .select(
        'ServiceInstance.id',
        'ServiceInstance.name',
        'ServiceInstance.slug',
        'ServiceInstance.description',
        'ServiceInstance.logo_document_id',
        'ServiceInstance.illustration_document_id',
        'ServiceInstance.tags',
        'ServiceInstance.ordering',
        dbRaw(
          formatRawObject({
            columnName: 'ServiceDefinition',
            typename: 'ServiceDefinition',
            as: 'service_definition',
          })
        ),
        dbRaw('json_agg("Service_Link") AS links')
      )
      .where('ServiceInstance.public', '=', true)
      .groupBy('ServiceInstance.id', 'ServiceDefinition.id')
      .orderBy('ServiceInstance.ordering', 'asc');
  },

  loadSeoServiceInstanceBySlug: async (
    slug: string
  ): Promise<
    ServiceInstance & {
      service_definition: ServiceDefinition;
      links: ServiceLink[];
    }
  > => {
    return db<ServiceInstance>('ServiceInstance')
      .leftJoin(
        'Service_Link',
        'Service_Link.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .select(
        'ServiceInstance.id',
        'ServiceInstance.name',
        'ServiceInstance.slug',
        'ServiceInstance.description',
        'ServiceInstance.logo_document_id',
        'ServiceInstance.illustration_document_id',
        'ServiceInstance.tags',
        dbRaw(
          formatRawObject({
            columnName: 'ServiceDefinition',
            typename: 'ServiceDefinition',
            as: 'service_definition',
          })
        ),
        dbRaw('json_agg("Service_Link") AS links')
      )
      .where('ServiceInstance.slug', '=', slug)
      .tap(restrictServiceInstanceToPublic)
      .groupBy('ServiceInstance.id', 'ServiceDefinition.id')
      .first();
  },

  loadPlatformServiceInstance: async (
    organizationId: OrganizationId,
    serviceInstanceId: string
  ) => {
    return db<ServiceInstance>('ServiceInstance')
      .leftJoin(
        'PlatformConfiguration',
        'PlatformConfiguration.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .leftJoin(
        'ServiceDefinition',
        'ServiceDefinition.id',
        '=',
        'ServiceInstance.service_definition_id'
      )
      .leftJoin(
        'Subscription',
        'Subscription.service_instance_id',
        '=',
        'ServiceInstance.id'
      )
      .where('ServiceInstance.id', '=', serviceInstanceId)
      .where('Subscription.organization_id', '=', organizationId)
      .whereIn('ServiceDefinition.identifier', [
        ServiceDefinitionIdentifier.OpenaevRegistration,
        ServiceDefinitionIdentifier.OpenctiRegistration,
        ServiceDefinitionIdentifier.XtmoneRegistration,
      ])
      .select('ServiceInstance.*')
      .first();
  },
  insertServiceInstance: async (
    data: ServiceInstanceInitializer
  ): Promise<ServiceInstance> => {
    const [serviceInstance] = await db<ServiceInstance>('ServiceInstance')
      .insert(data)
      .returning('*');
    if (!serviceInstance) {
      throw new Error(UnknownErrorCode.UnknownError);
    }
    return serviceInstance;
  },

  updateServiceInstance: async (
    id: ServiceInstanceId,
    data: ServiceInstanceMutator
  ) => {
    const [result] = await db<ServiceInstance>('ServiceInstance')
      .where({ id })
      .update(data)
      .returning('*');

    return result;
  },

  loadPlatformConfigurationByServiceInstanceId: async (
    serviceInstanceId: string
  ): Promise<PlatformConfigurationModel | null> => {
    return db<PlatformConfigurationModel>('PlatformConfiguration')
      .where('service_instance_id', '=', serviceInstanceId)
      .first()
      .select('*');
  },

  updatePlatformConfigurationByServiceInstanceId: async (
    serviceInstanceId: string,
    config: PlatformConfigurationMutator
  ): Promise<PlatformConfigurationModel | undefined> => {
    const qb = db<PlatformConfigurationModel>('PlatformConfiguration')
      .where('service_instance_id', '=', serviceInstanceId)
      .update({ ...config })
      .returning('*');

    const [result] = await qb;
    return result;
  },

  deleteServiceInstanceBy: async (filter: ServiceInstanceMutator) => {
    const [deletedServiceInstance] = await db<ServiceInstance>(
      'ServiceInstance'
    )
      .where(filter)
      .delete('*');
    return deletedServiceInstance;
  },
};
