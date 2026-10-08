import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { db, paginate } from '../../../knexfile';
import {
  CommercialModel,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  OrganizationCapability,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
  QuerySaasPlatformsArgs,
  RegisteredPlatformConnection,
  ServiceDefinitionIdentifier,
  ServiceInstanceCreationStatus,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import { DocumentId } from '../../model/kanel/public/Document';
import { OrganizationId } from '../../model/kanel/public/Organization';
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

const RegisteredPlatformsSelectColumns = [
  'ServiceDefinition.identifier as identifier',
  'ServiceInstance.id as id',
  'ServiceInstance.illustration_document_id as illustration_document_id',
  'PlatformConfiguration.*',
] as const;

const SaasPlatformsSelectColumns = [
  'ServiceInstance.id as id',
  'ServiceDefinition.identifier as identifier',
  'ServiceInstance.illustration_document_id as illustration_document_id',
  'PlatformConfiguration.platform_id as platform_id',
  'PlatformConfiguration.tenant_id as tenant_id',
  'PlatformConfiguration.tenant_name as tenant_name',
  'PlatformConfiguration.platform_title as title',
  'PlatformConfiguration.platform_url as url',
  'PlatformConfiguration.platform_contract as contract',
  'PlatformConfiguration.platform_version as version',
  'PlatformConfiguration.status as status',
  'PlatformConfiguration.last_connectivity_check as last_connectivity_check',
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
    return getRegisteredPlatformsDataQuery().where(
      'ServiceInstance.id',
      '=',
      serviceInstanceId
    );
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

  loadPlatformOwnerSubscriptionsByServiceInstanceIds: async (
    serviceInstanceIds: readonly ServiceInstanceId[]
  ): Promise<Subscription[]> => {
    if (serviceInstanceIds.length === 0) {
      return [];
    }
    return db<Subscription>('Subscription')
      .distinctOn('service_instance_id')
      .select<Subscription[]>('*')
      .whereIn('service_instance_id', [...serviceInstanceIds])
      .orderBy([
        { column: 'service_instance_id' },
        { column: 'start_date', order: 'asc', nulls: 'last' },
        { column: 'id', order: 'asc' },
      ]);
  },

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

  loadSaasPlatforms: async (
    opts: QuerySaasPlatformsArgs
  ): Promise<RegisteredPlatformConnection> => {
    const query = getRegisteredPlatformsBaseQuery()
      .queryContext({ __typename: 'RegisteredPlatform' })
      .where(
        'ServiceDefinition.identifier',
        '=',
        serviceDefinitionIdentifierMappedByPlatformIdentifier[
          PlatformIdentifier.Opencti
        ]
      )
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
      .select(SaasPlatformsSelectColumns);

    return paginate<ServiceInstance, RegisteredPlatformConnection>(
      'ServiceInstance',
      opts,
      undefined,
      query
    );
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

const getRegisteredPlatformsDataQuery = (): Knex.QueryBuilder<
  ServiceInstance,
  DomainRegisteredPlatform[]
> => {
  const user = requestContext.requireUser();
  const userSelectedOrganization = user.selected_organization_id;
  return getRegisteredPlatformsBaseQuery()
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
    .where('ServiceInstance.creation_status', '!=', 'DISABLED')
    .where('Subscription.organization_id', '=', userSelectedOrganization)
    .select(RegisteredPlatformsSelectColumns);
};
