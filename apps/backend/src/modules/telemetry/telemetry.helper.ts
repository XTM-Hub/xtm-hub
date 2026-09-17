import {
  DeploymentRequestSource,
  IntegrationType,
  Organization,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { UserId } from '../../model/kanel/public/User';
import { OrganizationDomain } from '../organization-management/organization/organization.domain';

import { requestContext } from '../../context/request.context';
import { DocumentMetadataDomain } from '../document/domain/document.metadata.domain';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import {
  TelemetryEventService,
  TelemetryEventServiceType,
  TelemetryOrganizationType,
  TelemetrySource,
  TelemetryTargetProduct,
} from './telemetry.const';
import {
  BaseTelemetryEvent,
  CreateDeploymentEvent,
  CreateEvent,
  CreateOrganizationEvent,
  DownloadEvent,
  ExportEvent,
  LoginEvent,
  OneClickDeployEvent,
  RegisterPlatformEvent,
  ShareEvent,
  SubscribeEvent,
  TelemetryEventType,
  UnregisterPlatformEvent,
  UpdateDeploymentEvent,
  UpdateOrganizationEvent,
} from './telemetry.types';

function getOrThrow<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined)
    throw new Error(`No mapping found for key "${String(key)}"`);
  return value;
}

function buildBaseEvent(
  organization: Organization | undefined,
  user_id: UserId | undefined,
  timestamp?: Date,
  source: TelemetrySource = TelemetrySource.XTMHUB
) {
  const eventTimestamp = timestamp || new Date();
  const organization_type: TelemetryOrganizationType = !organization
    ? TelemetryOrganizationType.PUBLIC
    : organization.personal_space
      ? TelemetryOrganizationType.PERSONAL
      : TelemetryOrganizationType.PROFESSIONAL;
  return {
    organization_id: organization?.id,
    organization_name: organization?.name,
    organization_type: organization_type,
    user_id,
    '@timestamp': eventTimestamp.toISOString(),
    source,
  };
}

const ServiceIdentifierToEventService = new Map<
  ServiceDefinitionIdentifier,
  TelemetryEventService
>([
  [
    ServiceDefinitionIdentifier.OpenaevScenarios,
    TelemetryEventService.OPENAEV_SCENARIOS_LIBRARY,
  ],
  [
    ServiceDefinitionIdentifier.OpenctiIntegrations,
    TelemetryEventService.INTEGRATIONS_LIBRARY,
  ],
  [
    ServiceDefinitionIdentifier.OpenctiCustomDashboards,
    TelemetryEventService.CUSTOM_DASHBOARDS_LIBRARY,
  ],
  [
    ServiceDefinitionIdentifier.OpenctiPlaybooks,
    TelemetryEventService.OPENCTI_PLAYBOOKS_LIBRARY,
  ],
  [
    ServiceDefinitionIdentifier.OpenctiCustomViews,
    TelemetryEventService.OPENCTI_CUSTOM_VIEWS_LIBRARY,
  ],
]);

export const TelemetryTargetProductMappedByPlatformIdentifier = new Map<
  PlatformIdentifier,
  TelemetryTargetProduct
>([
  [PlatformIdentifier.Opencti, TelemetryTargetProduct.OPEN_CTI],
  [PlatformIdentifier.Openaev, TelemetryTargetProduct.OPEN_AEV],
  [PlatformIdentifier.Xtmone, TelemetryTargetProduct.XTM_ONE],
]);

const IntegrationTypeToEventServiceType = new Map<
  IntegrationType,
  TelemetryEventServiceType
>([
  [IntegrationType.CsvFeed, TelemetryEventServiceType.CSV_FEEDS],
  [IntegrationType.Connector, TelemetryEventServiceType.CONNECTORS],
  [IntegrationType.TaxiiFeed, TelemetryEventServiceType.TAXII_FEEDS],
  [IntegrationType.RssFeed, TelemetryEventServiceType.RSS_FEEDS],
  [IntegrationType.Stream, TelemetryEventServiceType.STREAMS],
  [
    IntegrationType.ThirdPartyIntegration,
    TelemetryEventServiceType.THIRD_PARTY_INTEGRATIONS,
  ],
]);

const DeploymentRequestSourceToTelemetrySource = new Map<
  DeploymentRequestSource,
  TelemetrySource
>([
  [DeploymentRequestSource.Xtmhub, TelemetrySource.XTMHUB],
  [DeploymentRequestSource.OpenaevDemo, TelemetrySource.DEMO_OPENAEV],
  [DeploymentRequestSource.OpenctiDemo, TelemetrySource.DEMO_OPENCTI],
]);

const buildServiceTypeEvent = async (resource_id: string) => {
  const integration_type =
    await DocumentMetadataDomain.loadIntegrationType(resource_id);

  if (integration_type === null) return undefined;
  return IntegrationTypeToEventServiceType.get(integration_type);
};

export const TelemetryHelper = {
  shouldSendEventForService: (service: ServiceDefinitionIdentifier) => {
    return ServiceIdentifierToEventService.has(service);
  },

  buildLoginEvent: (
    organization: Organization,
    user_id: UserId,
    timestamp?: Date
  ): LoginEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);
    return {
      event_type: TelemetryEventType.LOGIN,
      ...baseEvent,
    };
  },

  buildSubscribeEvent: (
    organization: Organization,
    user_id: UserId,
    service: ServiceDefinitionIdentifier,
    timestamp?: Date
  ): SubscribeEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.SUBSCRIBE,
      ...baseEvent,
      service: getOrThrow(ServiceIdentifierToEventService, service),
    };
  },

  buildDownloadEvent: async (
    organization: Organization,
    user_id: UserId,
    service: ServiceDefinitionIdentifier,
    resource_id: string,
    resource_title: string,
    timestamp?: Date
  ): Promise<DownloadEvent> => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.DOWNLOAD,
      ...baseEvent,
      service: getOrThrow(ServiceIdentifierToEventService, service),
      service_type: await buildServiceTypeEvent(resource_id),
      resource_id: resource_id,
      resource_title: resource_title,
    };
  },

  buildExportEvent: (
    organization: Organization | undefined,
    user_id: UserId | undefined,
    service: ServiceDefinitionIdentifier,
    export_format: string = 'csv',
    timestamp?: Date
  ): ExportEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.EXPORT,
      ...baseEvent,
      service: getOrThrow(ServiceIdentifierToEventService, service),
      export_format,
    };
  },

  buildShareEvent: async (
    organization: Organization | undefined,
    user_id: UserId | undefined,
    service: ServiceDefinitionIdentifier,
    resource_id: string,
    resource_title: string,
    timestamp?: Date
  ): Promise<ShareEvent> => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.SHARE,
      ...baseEvent,
      service: getOrThrow(ServiceIdentifierToEventService, service),
      service_type: await buildServiceTypeEvent(resource_id),
      resource_id: resource_id,
      resource_title: resource_title,
    };
  },

  buildCreateEvent: async (
    document: Document,
    timestamp?: Date
  ): Promise<CreateEvent> => {
    const user = requestContext.requireUser();
    const selectedOrga = await OrganizationDomain.loadOrganizationBy({
      id: user.selected_organization_id,
    });

    const baseEvent = buildBaseEvent(selectedOrga, user.id, timestamp);

    if (!document.service_instance_id) {
      throw new Error(`Document ${document.id} has no service_instance_id`);
    }
    const serviceDefinition =
      await ServiceInstanceDomain.loadServiceDefinitionByServiceInstance(
        document.service_instance_id
      );
    if (!serviceDefinition) {
      throw new Error(
        `No service definition found for instance ${document.service_instance_id}`
      );
    }

    return {
      event_type: TelemetryEventType.CREATE,
      ...baseEvent,
      service: getOrThrow(
        ServiceIdentifierToEventService,
        serviceDefinition.identifier
      ),
      service_type: await buildServiceTypeEvent(document.id),
      resource_id: document.id,
      resource_title: document.name ?? '',
      status: document.active ? 'published' : 'draft',
    };
  },

  buildRegisterEvent: (
    organization: Organization,
    user_id: UserId,
    platform_identifier: PlatformIdentifier,
    platform_id: string,
    platform_contract: PlatformContract,
    platform_version: string | null | undefined,
    platform_url: string,
    existingUsersCount?: number,
    tenantId?: string,
    timestamp?: Date
  ): RegisterPlatformEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.REGISTER,
      ...baseEvent,
      target_product: getOrThrow(
        TelemetryTargetProductMappedByPlatformIdentifier,
        platform_identifier
      ),
      platform_id,
      platform_contract,
      platform_version,
      platform_url,
      ...(existingUsersCount !== undefined && {
        existing_users_count: existingUsersCount,
      }),
      ...(tenantId !== undefined && { tenant_id: tenantId }),
    };
  },

  buildUnregisterEvent: (
    organization: Organization,
    user_id: UserId,
    platform_identifier: PlatformIdentifier,
    platform_id: string,
    platform_contract: PlatformContract,
    platform_version: string | null | undefined,
    platform_url: string,
    tenantId?: string,
    timestamp?: Date
  ): UnregisterPlatformEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.UNREGISTER,
      ...baseEvent,
      target_product: getOrThrow(
        TelemetryTargetProductMappedByPlatformIdentifier,
        platform_identifier
      ),
      platform_id,
      platform_contract,
      platform_version,
      platform_url,
      ...(tenantId !== undefined && { tenant_id: tenantId }),
    };
  },

  buildOneClickDeployEvent: async (
    organization: Organization,
    user_id: UserId,
    service: ServiceDefinitionIdentifier,
    platform_identifier: PlatformIdentifier,
    platform_id: string,
    platform_version: string | undefined,
    resource_id: string,
    resource_title: string,
    tenant_id?: string,
    timestamp?: Date
  ): Promise<OneClickDeployEvent> => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.ONE_CLICK_DEPLOY,
      ...baseEvent,
      target_product: getOrThrow(
        TelemetryTargetProductMappedByPlatformIdentifier,
        platform_identifier
      ),
      service: getOrThrow(ServiceIdentifierToEventService, service),
      service_type: await buildServiceTypeEvent(resource_id),
      resource_id,
      resource_title,
      platform_id,
      platform_version,
      tenant_id,
    };
  },

  buildUpdateOrganizationEvent: (
    organization: Organization,
    user_id: UserId,
    timestamp?: Date
  ): UpdateOrganizationEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.UPDATE_ORGANIZATION,
      ...baseEvent,
      domains: organization.domains ?? [],
    };
  },

  buildCreateOrganizationEvent: (
    organization: Organization,
    user_id: UserId,
    timestamp?: Date
  ): CreateOrganizationEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      event_type: TelemetryEventType.CREATE_ORGANIZATION,
      ...baseEvent,
      domains: organization.domains ?? [],
    };
  },

  buildCreateDeploymentEvent: (
    organization: Organization,
    user_id: UserId,
    platform_identifier: PlatformIdentifier | undefined,
    source: DeploymentRequestSource,
    additional_data: Omit<
      CreateDeploymentEvent,
      'event_type' | 'target_product' | keyof BaseTelemetryEvent
    >,
    timestamp?: Date
  ): CreateDeploymentEvent => {
    const baseEvent = buildBaseEvent(
      organization,
      user_id,
      timestamp,
      DeploymentRequestSourceToTelemetrySource.get(source)
    );

    return {
      ...baseEvent,
      ...additional_data,
      event_type: TelemetryEventType.CREATE_DEPLOYMENT,
      target_product: platform_identifier
        ? getOrThrow(
            TelemetryTargetProductMappedByPlatformIdentifier,
            platform_identifier
          )
        : undefined,
    };
  },

  buildUpdateDeploymentEvent: (
    organization: Organization,
    user_id: UserId,
    additional_data: Omit<
      UpdateDeploymentEvent,
      'event_type' | keyof BaseTelemetryEvent
    >,
    timestamp?: Date
  ): UpdateDeploymentEvent => {
    const baseEvent = buildBaseEvent(organization, user_id, timestamp);

    return {
      ...baseEvent,
      ...additional_data,
      event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
    };
  },
};
