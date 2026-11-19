import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { db, dbRaw } from '../../../knexfile';
import {
  AdminRegisteredPlatformOrdering,
  CommercialModel,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  OrderingMode,
  OrganizationCapability,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  PortalCapability,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { DocumentId } from '../../model/kanel/public/Document';
import Organization, {
  OrganizationId,
} from '../../model/kanel/public/Organization';
import PlatformConfigurationModel from '../../model/kanel/public/PlatformConfiguration';
import { ServiceDefinitionId } from '../../model/kanel/public/ServiceDefinition';
import ServiceInstance, {
  ServiceInstanceId,
} from '../../model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../model/kanel/public/Subscription';
import { UserId } from '../../model/kanel/public/User';
import { securityGuard } from '../../security/guard';
import { ErrorCode } from '../../utils/error/error.code';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';
import { AuthHelper } from '../security-management/capability/auth.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { SubscriptionDomain } from '../subscription/subscription.domain';
import { PlatformConfigurationDomain } from './platform-configuration/platform-configuration.domain';
import { serviceDefinitionIdentifierMappedByPlatformIdentifier } from './registration.mapping';

export type PlatformConfigurationInput = {
  registerer_id: UserId;
  platform_id: string;
  tenant_id?: string;
  tenant_name?: string;
  platform_url: string;
  platform_title: string;
  platform_version?: string;
  platform_contract: PlatformContract;
  last_connectivity_check: Date;
  token: string;
  commercial_model?: CommercialModel;
};

export interface DomainRegisteredPlatform extends PlatformConfigurationModel {
  identifier: ServiceDefinitionIdentifier;
  illustration_document_id: DocumentId | null;
  id: string;
}

export interface PlatformOwnerOrganization extends Organization {
  service_instance_id: ServiceInstanceId;
}

// The token value never leaves the database: only whether one exists.
export interface AdminRegisteredPlatformRow {
  service_instance_id: ServiceInstanceId;
  platform_id: string;
  platform_title: string;
  platform_url: string;
  platform_version: string | null;
  platform_contract: PlatformContract;
  commercial_model: CommercialModel;
  tenant_id: string | null;
  tenant_name: string | null;
  status: PlatformConfigurationStatus;
  last_connectivity_check: Date | null;
  service_definition_identifier: ServiceDefinitionIdentifier;
  organization_id: OrganizationId | null;
  organization_name: string | null;
  registerer_id: UserId;
  registerer_email: string | null;
  registerer_first_name: string | null;
  registerer_last_name: string | null;
  has_token: boolean;
}

export interface AdminRegisteredPlatformsFilters {
  platformIdentifier?: PlatformIdentifier;
  status?: PlatformConfigurationStatus;
  organizationId?: OrganizationId;
  searchTerm?: string;
}

export interface AdminRegisteredPlatformsPage {
  rows: AdminRegisteredPlatformRow[];
  totalCount: number;
}

const AdminRegisteredPlatformOrderColumns: Record<
  AdminRegisteredPlatformOrdering,
  string
> = {
  [AdminRegisteredPlatformOrdering.Title]:
    'PlatformConfiguration.platform_title',
  [AdminRegisteredPlatformOrdering.LastConnectivityCheck]:
    'PlatformConfiguration.last_connectivity_check',
  [AdminRegisteredPlatformOrdering.OrganizationName]: 'Organization.name',
};

const AdminRegisteredPlatformSearchColumns = [
  'PlatformConfiguration.platform_title',
  'PlatformConfiguration.platform_url',
  'PlatformConfiguration.platform_id',
  'PlatformConfiguration.service_instance_id',
  'PlatformConfiguration.tenant_id',
  'PlatformConfiguration.tenant_name',
  'Organization.name',
  'User.email',
];

// The term is matched as %term% over every search column: a longer one cannot match more, it only costs more.
export const ADMIN_REGISTERED_PLATFORMS_SEARCH_TERM_MAX_LENGTH = 100;

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

const getAdminRegisteredPlatformsBaseQuery = () =>
  db<PlatformConfigurationModel>('PlatformConfiguration')
    .join(
      'ServiceInstance',
      'ServiceInstance.id',
      '=',
      'PlatformConfiguration.service_instance_id'
    )
    .join(
      'ServiceDefinition',
      'ServiceDefinition.id',
      '=',
      'ServiceInstance.service_definition_id'
    )
    .leftJoin(
      getPlatformOwnerSubscriptionsQuery()
        .select('service_instance_id', 'organization_id')
        .as('OwnerSubscription'),
      'OwnerSubscription.service_instance_id',
      '=',
      'PlatformConfiguration.service_instance_id'
    )
    .leftJoin(
      'Organization',
      'Organization.id',
      '=',
      'OwnerSubscription.organization_id'
    )
    .leftJoin('User', 'User.id', '=', 'PlatformConfiguration.registerer_id')
    .where('ServiceInstance.creation_status', '!=', 'DISABLED')
    .whereIn(
      'ServiceDefinition.identifier',
      Object.values(serviceDefinitionIdentifierMappedByPlatformIdentifier)
    );

const applyAdminRegisteredPlatformsFilters = (
  query: Knex.QueryBuilder,
  filters: AdminRegisteredPlatformsFilters
) => {
  const { platformIdentifier, status, organizationId, searchTerm } = filters;
  if (platformIdentifier) {
    query.where(
      'ServiceDefinition.identifier',
      '=',
      serviceDefinitionIdentifierMappedByPlatformIdentifier[platformIdentifier]
    );
  }
  if (status) {
    query.where('PlatformConfiguration.status', '=', status);
  }
  if (organizationId) {
    query.where('OwnerSubscription.organization_id', '=', organizationId);
  }
  const trimmedSearchTerm = searchTerm
    ?.trim()
    .slice(0, ADMIN_REGISTERED_PLATFORMS_SEARCH_TERM_MAX_LENGTH);
  if (trimmedSearchTerm) {
    const pattern = `%${escapeLikePattern(trimmedSearchTerm)}%`;
    query.where((search) => {
      AdminRegisteredPlatformSearchColumns.forEach((column) =>
        search.orWhereRaw('CAST(?? AS text) ILIKE ?', [column, pattern])
      );
    });
  }
  return query;
};

const selectAdminRegisteredPlatformColumns = (query: Knex.QueryBuilder) =>
  query.select<AdminRegisteredPlatformRow[]>([
    'PlatformConfiguration.service_instance_id',
    'PlatformConfiguration.platform_id',
    'PlatformConfiguration.platform_title',
    'PlatformConfiguration.platform_url',
    'PlatformConfiguration.platform_version',
    'PlatformConfiguration.platform_contract',
    'PlatformConfiguration.commercial_model',
    'PlatformConfiguration.tenant_id',
    'PlatformConfiguration.tenant_name',
    'PlatformConfiguration.status',
    'PlatformConfiguration.last_connectivity_check',
    'PlatformConfiguration.registerer_id',
    'ServiceDefinition.identifier as service_definition_identifier',
    'OwnerSubscription.organization_id as organization_id',
    'Organization.name as organization_name',
    'User.email as registerer_email',
    'User.first_name as registerer_first_name',
    'User.last_name as registerer_last_name',
    dbRaw('("PlatformConfiguration"."token" IS NOT NULL) as has_token'),
  ]);

const RegisteredPlatformsSelectColumns = [
  'ServiceDefinition.identifier as identifier',
  'ServiceInstance.id as id',
  'ServiceInstance.illustration_document_id as illustration_document_id',
  'PlatformConfiguration.*',
] as const;

export const RegistrationDomain = {
  registerNewPlatform: async ({
    serviceDefinitionId,
    organizationId,
    configuration,
    platformIdentifier,
    serviceInstanceCreationStatus = ServiceInstanceCreationStatus.Ready,
  }: {
    serviceDefinitionId: ServiceDefinitionId;
    organizationId: OrganizationId;
    configuration?: PlatformConfigurationInput;
    platformIdentifier: PlatformIdentifier;
    serviceInstanceCreationStatus?: ServiceInstanceCreationStatus;
  }): Promise<ServiceInstanceId> => {
    const user = requestContext.requireUser();
    await securityGuard.assertUserIsAllowedOnOrganization(user, {
      organizationId,
      requiredCapability: OrganizationCapability.ManagePlatformRegistration,
    });

    const serviceInstanceId =
      await ServiceInstanceDomain.createPlatformServiceInstance(
        serviceDefinitionId,
        platformIdentifier,
        serviceInstanceCreationStatus
      );

    await SubscriptionDomain.createSubscription({
      id: uuidv4() as SubscriptionId,
      organization_id: organizationId,
      service_instance_id: serviceInstanceId,
      start_date: new Date(),
      end_date: null,
    });

    if (configuration) {
      await PlatformConfigurationDomain.createConfiguration(
        serviceInstanceId,
        configuration
      );
    }
    return serviceInstanceId;
  },

  refreshExistingPlatform: async ({
    configuration,
    serviceInstanceId,
    targetOrganizationId,
  }: {
    configuration: PlatformConfigurationInput;
    serviceInstanceId: ServiceInstanceId;
    targetOrganizationId: OrganizationId;
  }) => {
    const user = requestContext.requireUser();
    await securityGuard.assertUserIsAllowedOnOrganization(user, {
      organizationId: targetOrganizationId,
      requiredCapability: OrganizationCapability.ManagePlatformRegistration,
    });
    const subscription = await SubscriptionDomain.loadSubscriptionBy({
      service_instance_id: serviceInstanceId,
    });
    if (!subscription) {
      throw new Error(ErrorCode.SubscriptionNotFound);
    }

    if (subscription.organization_id !== targetOrganizationId) {
      const userOrganizations =
        await OrganizationDomain.loadOrganizationsByUser(user.id);
      if (userOrganizations.length > 2) {
        throw new Error(ErrorCode.RegistrationOnAnotherOrganizationForbidden);
      }

      await securityGuard.assertUserIsAllowedOnOrganization(user, {
        organizationId: subscription.organization_id,
        requiredCapability: OrganizationCapability.ManagePlatformRegistration,
      });

      await SubscriptionDomain.transferSubscriptionToOrganization({
        subscriptionId: subscription.id,
        organizationId: targetOrganizationId,
      });
    }

    await PlatformConfigurationDomain.updateConfiguration(serviceInstanceId, {
      ...configuration,
      status: PlatformConfigurationStatus.Active,
    });
  },

  loadRegisteredPlatform: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<DomainRegisteredPlatform[]> => {
    const skipOrganizationFilter = AuthHelper.userHasPortalCapability(
      requestContext.requireUser(),
      [PortalCapability.Bypass, PortalCapability.ReadSaasMetrics]
    );
    return getRegisteredPlatformsDataQuery({ skipOrganizationFilter }).where(
      'ServiceInstance.id',
      '=',
      serviceInstanceId
    );
  },

  // Active registration of one platform tenant in the selected organization; a null tenant matches only a
  // registration without tenant.
  loadRegisteredPlatformByPlatformId: async ({
    platformIdentifier,
    platformId,
    tenantId,
  }: {
    platformIdentifier: PlatformIdentifier;
    platformId: string;
    tenantId: string | null;
  }): Promise<DomainRegisteredPlatform | undefined> => {
    const query = getRegisteredPlatformsDataQuery()
      .where(
        'ServiceDefinition.identifier',
        '=',
        serviceDefinitionIdentifierMappedByPlatformIdentifier[
          platformIdentifier
        ]
      )
      .where('PlatformConfiguration.platform_id', '=', platformId)
      .where(
        'PlatformConfiguration.status',
        '=',
        PlatformConfigurationStatus.Active
      );
    if (tenantId) {
      query.where('PlatformConfiguration.tenant_id', '=', tenantId);
    } else {
      query.whereNull('PlatformConfiguration.tenant_id');
    }
    return query.first();
  },

  loadRegisteredPlatformsByServiceInstanceIds: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<DomainRegisteredPlatform[]> => {
    if (serviceInstanceIds.length === 0) {
      return [];
    }
    return getRegisteredPlatformsDataQuery().whereIn('ServiceInstance.id', [
      ...serviceInstanceIds,
    ]);
  },

  loadSaasRegisteredPlatformsByPlatformIds: async (
    platformIds: readonly string[]
  ): Promise<DomainRegisteredPlatform[]> => {
    if (platformIds.length === 0) {
      return [];
    }
    const skipOrganizationFilter = AuthHelper.userHasPortalCapability(
      requestContext.requireUser(),
      [PortalCapability.Bypass, PortalCapability.ReadSaasMetrics]
    );
    return getRegisteredPlatformsDataQuery({ skipOrganizationFilter })
      .whereIn('PlatformConfiguration.platform_id', [...platformIds])
      .where(
        'PlatformConfiguration.status',
        '=',
        PlatformConfigurationStatus.Active
      )
      .where(
        'PlatformConfiguration.commercial_model',
        '=',
        CommercialModel.Saas
      )
      .orderBy('PlatformConfiguration.last_connectivity_check', 'desc', 'last');
  },

  loadPlatformOwnerOrganizationsByServiceInstanceIds: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<PlatformOwnerOrganization[]> => {
    if (serviceInstanceIds.length === 0) {
      return [];
    }
    return db<Organization>('Organization')
      .join(
        getPlatformOwnerSubscriptionsQuery()
          .select('service_instance_id', 'organization_id')
          .whereIn('service_instance_id', [...serviceInstanceIds])
          .as('OwnerSubscription'),
        'OwnerSubscription.organization_id',
        '=',
        'Organization.id'
      )
      .select<PlatformOwnerOrganization[]>(
        'Organization.*',
        'OwnerSubscription.service_instance_id'
      );
  },

  // Every organization: the caller is a platform admin, checked by the resolver guard.
  loadAdminRegisteredPlatforms: async ({
    filters,
    offset,
    limit,
    orderBy,
    orderMode,
  }: {
    filters: AdminRegisteredPlatformsFilters;
    offset: number;
    limit: number;
    orderBy: AdminRegisteredPlatformOrdering;
    orderMode: OrderingMode;
  }): Promise<AdminRegisteredPlatformsPage> => {
    const filteredQuery = applyAdminRegisteredPlatformsFilters(
      getAdminRegisteredPlatformsBaseQuery(),
      filters
    );
    const countQuery = filteredQuery
      .clone()
      .count<{ count: string }[]>('PlatformConfiguration.service_instance_id');
    const rowsQuery = selectAdminRegisteredPlatformColumns(filteredQuery)
      .orderBy([
        {
          column: AdminRegisteredPlatformOrderColumns[orderBy],
          order: orderMode,
          nulls: 'last',
        },
        { column: 'PlatformConfiguration.service_instance_id', order: 'asc' },
      ])
      .offset(offset)
      .limit(limit);

    const [rows, [countRow]] = await Promise.all([rowsQuery, countQuery]);
    return { rows, totalCount: Number(countRow?.count ?? 0) };
  },

  loadAdminRegisteredPlatform: async (
    serviceInstanceId: ServiceInstanceId
  ): Promise<AdminRegisteredPlatformRow | undefined> =>
    selectAdminRegisteredPlatformColumns(
      getAdminRegisteredPlatformsBaseQuery().where(
        'PlatformConfiguration.service_instance_id',
        '=',
        serviceInstanceId
      )
    ).first(),

  loadAllActiveRegisteredPlatformsByPlatformIdentifier: async (
    platformIdentifier: PlatformIdentifier
  ): Promise<DomainRegisteredPlatform[]> => {
    const serviceDefinitionIdentifier =
      serviceDefinitionIdentifierMappedByPlatformIdentifier[platformIdentifier];

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
      .where('ServiceInstance.creation_status', '!=', 'DISABLED')
      .where('ServiceDefinition.identifier', '=', serviceDefinitionIdentifier)
      .where(
        'PlatformConfiguration.status',
        '=',
        PlatformConfigurationStatus.Active
      )
      .select(RegisteredPlatformsSelectColumns);
  },

  loadRegisteredPlatforms: async (
    query: {
      platformIdentifier?: PlatformIdentifier;
      onlyActive?: boolean;
      onlyTrial?: boolean;
      hasDeployedResources?: boolean;
    } = {}
  ): Promise<DomainRegisteredPlatform[]> => {
    const { platformIdentifier, onlyActive, onlyTrial, hasDeployedResources } =
      query;
    const serviceDefinitionIdentifiers = platformIdentifier
      ? [
          serviceDefinitionIdentifierMappedByPlatformIdentifier[
            platformIdentifier
          ],
        ]
      : Object.values(serviceDefinitionIdentifierMappedByPlatformIdentifier);

    return getRegisteredPlatformsDataQuery()
      .whereIn('ServiceDefinition.identifier', serviceDefinitionIdentifiers)
      .where(function () {
        this.where('PlatformConfiguration.status', '=', 'active').orWhereNull(
          'PlatformConfiguration.service_instance_id'
        );
      })
      .where(function () {
        if (onlyActive) {
          this.whereNull('DeploymentRequest.id').orWhere(function () {
            this.where(
              'DeploymentRequest.counts_in_orga_quota',
              '=',
              true
            ).andWhere(
              'DeploymentRequest.hub_status',
              '=',
              DeploymentRequestHubStatus.Active
            );
          });
        }
      })
      .where(function () {
        if (onlyTrial) {
          this.whereNotNull('DeploymentRequest.id').andWhere(function () {
            this.where(
              'DeploymentRequest.counts_in_orga_quota',
              '=',
              true
            ).andWhere(
              'DeploymentRequest.type',
              '=',
              DeploymentRequestDeploymentType.Trial
            );
          });
        }
      })
      .where(function () {
        if (hasDeployedResources) {
          this.whereExists(function () {
            this.from('OneClickDeployment')
              .whereRaw(
                '"OneClickDeployment".platform_id = "PlatformConfiguration".platform_id'
              )
              .whereRaw(
                '"OneClickDeployment".tenant_id IS NOT DISTINCT FROM "PlatformConfiguration".tenant_id'
              );
          });
        }
      });
  },
};

// The owner of a platform is the organization of its newest subscription.
const getPlatformOwnerSubscriptionsQuery = () =>
  db<Subscription>('Subscription')
    .distinctOn('service_instance_id')
    .orderBy([
      { column: 'service_instance_id' },
      { column: 'start_date', order: 'desc', nulls: 'last' },
      { column: 'id', order: 'asc' },
    ]);

const getRegisteredPlatformsBaseQuery = () =>
  db<ServiceInstance>('ServiceInstance')
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
    .where('ServiceInstance.creation_status', '!=', 'DISABLED');

const getRegisteredPlatformsDataQuery = ({
  skipOrganizationFilter = false,
}: { skipOrganizationFilter?: boolean } = {}): Knex.QueryBuilder<
  ServiceInstance,
  DomainRegisteredPlatform[]
> => {
  const user = requestContext.requireUser();
  const userSelectedOrganization = user.selected_organization_id;
  const query = getRegisteredPlatformsBaseQuery()
    .leftJoin(
      'Subscription',
      'Subscription.service_instance_id',
      '=',
      'ServiceInstance.id'
    )
    .leftJoin(
      'DeploymentRequest',
      'DeploymentRequest.service_instance_id',
      '=',
      'ServiceInstance.id'
    )
    .select(RegisteredPlatformsSelectColumns);
  if (!skipOrganizationFilter) {
    query.where('Subscription.organization_id', '=', userSelectedOrganization);
  }
  return query;
};
