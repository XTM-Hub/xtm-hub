import { v4 as uuidv4 } from 'uuid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextSimpleUserSecondOrga,
  SERVICES,
  TEST_ORGANIZATIONS,
} from '../../../tests/tests.const';
import {
  DeploymentRequestActivitySector,
  DeploymentRequestDeploymentType,
  DeploymentRequestHubStatus,
  DeploymentRequestJobTitle,
  DeploymentRequestPlatformRegion,
  DeploymentRequestSource,
  DeploymentRequestUseCase,
  DocumentMetadataKeyCode,
  HasRepliedSatisfaction,
  IntegrationType,
  Organization,
  PlatformContract,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { requestContext } from '../../context/request.context';
import Document, { DocumentId } from '../../model/kanel/public/Document';
import { OrganizationId } from '../../model/kanel/public/Organization';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { UserId } from '../../model/kanel/public/User';
import {
  TelemetryEventService,
  TelemetryEventServiceType,
  TelemetryOrganizationType,
  TelemetrySource,
  TelemetryTargetProduct,
} from './telemetry.const';
import { TelemetryHelper } from './telemetry.helper';
import { TelemetryEventType } from './telemetry.types';

const CURRENT_USER = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2;
const DEPLOYMENT_ID = '0b9d3c1e-6f4a-4d2b-9a57-2c8e1f3b7d40';
const JUSTIFICATION = 'Deployment took too long';

const TIMESTAMP = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
const TIMESTAMP_ISO = '2025-02-03T13:12:15.000Z';
const USER_ID = '5a0e1c7b-3d2f-4b8e-9c6a-1f4d7e2b8a03' as UserId;
const ORGANIZATION_ID = '9c4b2e1f-7a3d-4e6b-8f5c-2d1a9e7b3c64';
const ORGANIZATION_NAME = 'Acme';
const ORGANIZATION_DOMAINS = ['acme.com', 'acme.io'];
const RESOURCE_ID = '3e7f1a9c-2b4d-4c8e-a6f1-7d9b2e5c1a08';
const RESOURCE_TITLE = 'My CSV feed';
const PLATFORM_ID = 'c2d8e4f1-9a6b-4b3c-8e7d-5f1a2c9b6e40';
const PLATFORM_VERSION = '6.4.0';
const PLATFORM_URL = 'https://opencti.acme.com';
const TENANT_ID = 'tenant-acme';
const EXISTING_USERS_COUNT = 12;
const REQUESTER_EMAIL = 'requester@acme.com';

const makeOrganization = (
  overrides: Partial<Organization> = {}
): Organization => ({
  id: ORGANIZATION_ID,
  name: ORGANIZATION_NAME,
  personal_space: false,
  domains: ORGANIZATION_DOMAINS,
  ...overrides,
});

const PROFESSIONAL_BASE_EVENT = {
  '@timestamp': TIMESTAMP_ISO,
  organization_id: ORGANIZATION_ID,
  organization_name: ORGANIZATION_NAME,
  organization_type: TelemetryOrganizationType.PROFESSIONAL,
  source: TelemetrySource.XTMHUB,
  user_id: USER_ID,
};

const createdDocumentIds: DocumentId[] = [];

const createIntegrationDocument = async (
  integrationType: IntegrationType
): Promise<Document> => {
  const document = await TestHelper.document.create({
    name: `telemetry-helper-${uuidv4()}`,
    active: true,
    service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
  });
  createdDocumentIds.push(document.id);
  await TestHelper.documentMetadata.create({
    document_id: document.id,
    key: DocumentMetadataKeyCode.IntegrationType,
    value: integrationType,
  });
  return document;
};

describe('telemetryHelper', () => {
  afterEach(async () => {
    vi.useRealTimers();
    for (const documentId of createdDocumentIds.splice(0)) {
      await TestHelper.documentMetadata.delete({ document_id: documentId });
      await TestHelper.document.delete({ id: documentId });
    }
  });

  describe('shouldSendEventForService', () => {
    it.each([
      { service: ServiceDefinitionIdentifier.OpenaevScenarios, expected: true },
      {
        service: ServiceDefinitionIdentifier.OpenctiIntegrations,
        expected: true,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        expected: true,
      },
      { service: ServiceDefinitionIdentifier.OpenctiPlaybooks, expected: true },
      {
        service: ServiceDefinitionIdentifier.OpenctiCustomViews,
        expected: true,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiHuntPacks,
        expected: true,
      },
      { service: ServiceDefinitionIdentifier.Link, expected: false },
      {
        service: ServiceDefinitionIdentifier.OpenaevRegistration,
        expected: false,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiRegistration,
        expected: false,
      },
      {
        service: ServiceDefinitionIdentifier.XtmPlatformBundle,
        expected: false,
      },
      {
        service: ServiceDefinitionIdentifier.XtmPlatformRoadmap,
        expected: false,
      },
      {
        service: ServiceDefinitionIdentifier.XtmoneRegistration,
        expected: false,
      },
    ])(
      'should return $expected when the service is $service',
      ({ service, expected }) => {
        // When
        const result = TelemetryHelper.shouldSendEventForService(service);

        // Then
        expect(result).toBe(expected);
      }
    );
  });

  describe('buildLoginEvent', () => {
    it('should build the login event for the given organization and user', () => {
      // When
      const event = TelemetryHelper.buildLoginEvent(
        makeOrganization(),
        USER_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.LOGIN,
      });
    });

    it.each([
      {
        personalSpace: false,
        expectedOrganizationType: TelemetryOrganizationType.PROFESSIONAL,
      },
      {
        personalSpace: true,
        expectedOrganizationType: TelemetryOrganizationType.PERSONAL,
      },
    ])(
      'should flag the organization as $expectedOrganizationType when personal_space is $personalSpace',
      ({ personalSpace, expectedOrganizationType }) => {
        // Given
        const organization = makeOrganization({
          personal_space: personalSpace,
        });

        // When
        const event = TelemetryHelper.buildLoginEvent(
          organization,
          USER_ID,
          TIMESTAMP
        );

        // Then
        expect(event.organization_type).toBe(expectedOrganizationType);
      }
    );

    it('should timestamp the event with the current date when no timestamp is given', () => {
      // Given
      vi.useFakeTimers();
      vi.setSystemTime(TIMESTAMP);

      // When
      const event = TelemetryHelper.buildLoginEvent(
        makeOrganization(),
        USER_ID
      );

      // Then
      expect(event['@timestamp']).toBe(TIMESTAMP_ISO);
    });
  });

  describe('buildSubscribeEvent', () => {
    it('should build the subscribe event for the given service', () => {
      // When
      const event = TelemetryHelper.buildSubscribeEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.SUBSCRIBE,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
      });
    });

    it.each([
      {
        service: ServiceDefinitionIdentifier.OpenaevScenarios,
        expectedService: TelemetryEventService.OPENAEV_SCENARIOS_LIBRARY,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiIntegrations,
        expectedService: TelemetryEventService.INTEGRATIONS_LIBRARY,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        expectedService: TelemetryEventService.CUSTOM_DASHBOARDS_LIBRARY,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiPlaybooks,
        expectedService: TelemetryEventService.OPENCTI_PLAYBOOKS_LIBRARY,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiCustomViews,
        expectedService: TelemetryEventService.OPENCTI_CUSTOM_VIEWS_LIBRARY,
      },
      {
        service: ServiceDefinitionIdentifier.OpenctiHuntPacks,
        expectedService: TelemetryEventService.OPENCTI_HUNT_PACKS_LIBRARY,
      },
    ])(
      'should map the $service service to the $expectedService event service',
      ({ service, expectedService }) => {
        // When
        const event = TelemetryHelper.buildSubscribeEvent(
          makeOrganization(),
          USER_ID,
          service,
          TIMESTAMP
        );

        // Then
        expect(event.service).toBe(expectedService);
      }
    );

    it('should throw when the service has no telemetry mapping', () => {
      // When
      const call = () =>
        TelemetryHelper.buildSubscribeEvent(
          makeOrganization(),
          USER_ID,
          ServiceDefinitionIdentifier.Link,
          TIMESTAMP
        );

      // Then
      expect(call).toThrow('No mapping found for key "link"');
    });
  });

  describe('buildDownloadEvent', () => {
    it('should build the download event for the given resource', async () => {
      // Given
      const document = await createIntegrationDocument(IntegrationType.CsvFeed);

      // When
      const event = await TelemetryHelper.buildDownloadEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        document.id,
        RESOURCE_TITLE,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.DOWNLOAD,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.CSV_FEEDS,
        resource_id: document.id,
        resource_title: RESOURCE_TITLE,
      });
    });

    it.each([
      {
        integrationType: IntegrationType.CsvFeed,
        expectedServiceType: TelemetryEventServiceType.CSV_FEEDS,
      },
      {
        integrationType: IntegrationType.Connector,
        expectedServiceType: TelemetryEventServiceType.CONNECTORS,
      },
      {
        integrationType: IntegrationType.TaxiiFeed,
        expectedServiceType: TelemetryEventServiceType.TAXII_FEEDS,
      },
      {
        integrationType: IntegrationType.RssFeed,
        expectedServiceType: TelemetryEventServiceType.RSS_FEEDS,
      },
      {
        integrationType: IntegrationType.Stream,
        expectedServiceType: TelemetryEventServiceType.STREAMS,
      },
      {
        integrationType: IntegrationType.ThirdPartyIntegration,
        expectedServiceType: TelemetryEventServiceType.THIRD_PARTY_INTEGRATIONS,
      },
    ])(
      'should map the $integrationType integration type to the $expectedServiceType service type',
      async ({ integrationType, expectedServiceType }) => {
        // Given
        const document = await createIntegrationDocument(integrationType);

        // When
        const event = await TelemetryHelper.buildDownloadEvent(
          makeOrganization(),
          USER_ID,
          ServiceDefinitionIdentifier.OpenctiIntegrations,
          document.id,
          RESOURCE_TITLE,
          TIMESTAMP
        );

        // Then
        expect(event.service_type).toBe(expectedServiceType);
      }
    );

    it('should leave the service type undefined when the resource has no integration type', async () => {
      // When
      const event = await TelemetryHelper.buildDownloadEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiCustomDashboards,
        RESOURCE_ID,
        RESOURCE_TITLE,
        TIMESTAMP
      );

      // Then
      expect(event.service_type).toBeUndefined();
    });
  });

  describe('buildExportEvent', () => {
    it('should build the export event with the given format', () => {
      // When
      const event = TelemetryHelper.buildExportEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        'json',
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.EXPORT,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        export_format: 'json',
      });
    });

    it('should default the export format to csv when none is given', () => {
      // When
      const event = TelemetryHelper.buildExportEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations
      );

      // Then
      expect(event.export_format).toBe('csv');
    });

    it('should build a public event when there is no organization nor user', () => {
      // When
      const event = TelemetryHelper.buildExportEvent(
        undefined,
        undefined,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        'csv',
        TIMESTAMP
      );

      // Then
      expect(event).toStrictEqual({
        '@timestamp': TIMESTAMP_ISO,
        event_type: TelemetryEventType.EXPORT,
        organization_id: undefined,
        organization_name: undefined,
        organization_type: TelemetryOrganizationType.PUBLIC,
        source: TelemetrySource.XTMHUB,
        user_id: undefined,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        export_format: 'csv',
      });
    });
  });

  describe('buildShareEvent', () => {
    it('should build the share event for the given resource', async () => {
      // Given
      const document = await createIntegrationDocument(
        IntegrationType.Connector
      );

      // When
      const event = await TelemetryHelper.buildShareEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        document.id,
        RESOURCE_TITLE,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.SHARE,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.CONNECTORS,
        resource_id: document.id,
        resource_title: RESOURCE_TITLE,
      });
    });
  });

  describe('buildCreateEvent', () => {
    it('should build the create event for the document and the current user', async () => {
      // Given
      const document = await createIntegrationDocument(IntegrationType.Stream);

      // When
      const event = await TelemetryHelper.buildCreateEvent(document, TIMESTAMP);

      // Then
      expect(event).toEqual({
        '@timestamp': TIMESTAMP_ISO,
        event_type: TelemetryEventType.CREATE,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: CURRENT_USER.ID,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.STREAMS,
        resource_id: document.id,
        resource_title: document.name,
        status: 'published',
      });
    });

    it.each([
      { active: true, expectedStatus: 'published' },
      { active: false, expectedStatus: 'draft' },
    ])(
      'should set the status to $expectedStatus when the document active flag is $active',
      async ({ active, expectedStatus }) => {
        // Given
        const document = TestHelper.document.build({
          id: RESOURCE_ID as DocumentId,
          active,
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
        });

        // When
        const event = await TelemetryHelper.buildCreateEvent(
          document,
          TIMESTAMP
        );

        // Then
        expect(event.status).toBe(expectedStatus);
      }
    );

    it('should set an empty resource title when the document has no name', async () => {
      // Given
      const document = TestHelper.document.build({
        id: RESOURCE_ID as DocumentId,
        name: null,
        service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
      });

      // When
      const event = await TelemetryHelper.buildCreateEvent(document, TIMESTAMP);

      // Then
      expect(event.resource_title).toBe('');
    });

    it('should throw when the document has no service instance', async () => {
      // Given
      const document = TestHelper.document.build({
        id: RESOURCE_ID as DocumentId,
        service_instance_id: null,
      });

      // When
      const call = TelemetryHelper.buildCreateEvent(document, TIMESTAMP);

      // Then
      await expect(call).rejects.toThrow(
        `Document ${RESOURCE_ID} has no service_instance_id`
      );
    });

    it('should throw when the service instance of the document does not exist', async () => {
      // Given
      const unknownServiceInstanceId = uuidv4() as ServiceInstanceId;
      const document = TestHelper.document.build({
        id: RESOURCE_ID as DocumentId,
        service_instance_id: unknownServiceInstanceId,
      });

      // When
      const call = TelemetryHelper.buildCreateEvent(document, TIMESTAMP);

      // Then
      await expect(call).rejects.toThrow(
        `No service definition found for instance ${unknownServiceInstanceId}`
      );
    });
  });

  describe('buildRegisterEvent', () => {
    it('should build the register event with the platform details', () => {
      // When
      const event = TelemetryHelper.buildRegisterEvent(
        makeOrganization(),
        USER_ID,
        PlatformIdentifier.Opencti,
        PLATFORM_ID,
        PlatformContract.Ee,
        PLATFORM_VERSION,
        PLATFORM_URL,
        EXISTING_USERS_COUNT,
        TENANT_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.REGISTER,
        target_product: TelemetryTargetProduct.OPEN_CTI,
        platform_id: PLATFORM_ID,
        platform_contract: PlatformContract.Ee,
        platform_version: PLATFORM_VERSION,
        platform_url: PLATFORM_URL,
        existing_users_count: EXISTING_USERS_COUNT,
        tenant_id: TENANT_ID,
      });
    });

    it.each([
      {
        platformIdentifier: PlatformIdentifier.Opencti,
        expectedTargetProduct: TelemetryTargetProduct.OPEN_CTI,
      },
      {
        platformIdentifier: PlatformIdentifier.Openaev,
        expectedTargetProduct: TelemetryTargetProduct.OPEN_AEV,
      },
      {
        platformIdentifier: PlatformIdentifier.Xtmone,
        expectedTargetProduct: TelemetryTargetProduct.XTM_ONE,
      },
    ])(
      'should map the $platformIdentifier platform to the $expectedTargetProduct target product',
      ({ platformIdentifier, expectedTargetProduct }) => {
        // When
        const event = TelemetryHelper.buildRegisterEvent(
          makeOrganization(),
          USER_ID,
          platformIdentifier,
          PLATFORM_ID,
          PlatformContract.Ce,
          PLATFORM_VERSION,
          PLATFORM_URL,
          undefined,
          undefined,
          TIMESTAMP
        );

        // Then
        expect(event.target_product).toBe(expectedTargetProduct);
      }
    );

    it('should omit the existing users count and the tenant when they are not given', () => {
      // When
      const event = TelemetryHelper.buildRegisterEvent(
        makeOrganization(),
        USER_ID,
        PlatformIdentifier.Opencti,
        PLATFORM_ID,
        PlatformContract.Ce,
        PLATFORM_VERSION,
        PLATFORM_URL,
        undefined,
        undefined,
        TIMESTAMP
      );

      // Then
      expect(event).toStrictEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.REGISTER,
        target_product: TelemetryTargetProduct.OPEN_CTI,
        platform_id: PLATFORM_ID,
        platform_contract: PlatformContract.Ce,
        platform_version: PLATFORM_VERSION,
        platform_url: PLATFORM_URL,
      });
    });
  });

  describe('buildUnregisterEvent', () => {
    it('should build the unregister event with the platform details', () => {
      // When
      const event = TelemetryHelper.buildUnregisterEvent(
        makeOrganization(),
        USER_ID,
        PlatformIdentifier.Openaev,
        PLATFORM_ID,
        PlatformContract.Trial,
        PLATFORM_VERSION,
        PLATFORM_URL,
        TENANT_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.UNREGISTER,
        target_product: TelemetryTargetProduct.OPEN_AEV,
        platform_id: PLATFORM_ID,
        platform_contract: PlatformContract.Trial,
        platform_version: PLATFORM_VERSION,
        platform_url: PLATFORM_URL,
        tenant_id: TENANT_ID,
      });
    });

    it('should omit the tenant when it is not given', () => {
      // When
      const event = TelemetryHelper.buildUnregisterEvent(
        makeOrganization(),
        USER_ID,
        PlatformIdentifier.Openaev,
        PLATFORM_ID,
        PlatformContract.Trial,
        PLATFORM_VERSION,
        PLATFORM_URL,
        undefined,
        TIMESTAMP
      );

      // Then
      expect(event).not.toHaveProperty('tenant_id');
    });
  });

  describe('buildOneClickDeployEvent', () => {
    it('should build the one-click deploy event for the resource and the target platform', async () => {
      // Given
      const document = await createIntegrationDocument(
        IntegrationType.TaxiiFeed
      );

      // When
      const event = await TelemetryHelper.buildOneClickDeployEvent(
        makeOrganization(),
        USER_ID,
        ServiceDefinitionIdentifier.OpenctiIntegrations,
        PlatformIdentifier.Opencti,
        PLATFORM_ID,
        PLATFORM_VERSION,
        document.id,
        RESOURCE_TITLE,
        TENANT_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.ONE_CLICK_DEPLOY,
        target_product: TelemetryTargetProduct.OPEN_CTI,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.TAXII_FEEDS,
        resource_id: document.id,
        resource_title: RESOURCE_TITLE,
        platform_id: PLATFORM_ID,
        platform_version: PLATFORM_VERSION,
        tenant_id: TENANT_ID,
      });
    });
  });

  describe('buildUpdateOrganizationEvent', () => {
    it('should build the update organization event with the organization domains', () => {
      // When
      const event = TelemetryHelper.buildUpdateOrganizationEvent(
        makeOrganization(),
        USER_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.UPDATE_ORGANIZATION,
        domains: ORGANIZATION_DOMAINS,
      });
    });

    it.each([null, undefined])(
      'should send no domain when the organization domains are %s',
      (domains) => {
        // Given
        const organization = makeOrganization({ domains });

        // When
        const event = TelemetryHelper.buildUpdateOrganizationEvent(
          organization,
          USER_ID,
          TIMESTAMP
        );

        // Then
        expect(event.domains).toEqual([]);
      }
    );
  });

  describe('buildCreateOrganizationEvent', () => {
    it('should build the create organization event with the organization domains', () => {
      // When
      const event = TelemetryHelper.buildCreateOrganizationEvent(
        makeOrganization(),
        USER_ID,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        event_type: TelemetryEventType.CREATE_ORGANIZATION,
        domains: ORGANIZATION_DOMAINS,
      });
    });

    it.each([null, undefined])(
      'should send no domain when the organization domains are %s',
      (domains) => {
        // Given
        const organization = makeOrganization({ domains });

        // When
        const event = TelemetryHelper.buildCreateOrganizationEvent(
          organization,
          USER_ID,
          TIMESTAMP
        );

        // Then
        expect(event.domains).toEqual([]);
      }
    );
  });

  describe('buildCreateDeploymentEvent', () => {
    const DEPLOYMENT_DATA = {
      activity_sector: DeploymentRequestActivitySector.ComputerNetworkSecurity,
      deployment_id: DEPLOYMENT_ID,
      deployment_type: DeploymentRequestDeploymentType.Trial,
      email: REQUESTER_EMAIL,
      job_title: DeploymentRequestJobTitle.CybersecurityEngineer,
      region: DeploymentRequestPlatformRegion.UsEast,
      status: DeploymentRequestHubStatus.Pending,
      use_case: DeploymentRequestUseCase.ThreatHunting,
    };

    it('should build the create deployment event with the deployment details', () => {
      // When
      const event = TelemetryHelper.buildCreateDeploymentEvent(
        makeOrganization(),
        USER_ID,
        PlatformIdentifier.Opencti,
        DeploymentRequestSource.Xtmhub,
        DEPLOYMENT_DATA,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        ...DEPLOYMENT_DATA,
        event_type: TelemetryEventType.CREATE_DEPLOYMENT,
        target_product: TelemetryTargetProduct.OPEN_CTI,
      });
    });

    it('should leave the target product undefined when the deployment has no platform', () => {
      // When
      const event = TelemetryHelper.buildCreateDeploymentEvent(
        makeOrganization(),
        USER_ID,
        undefined,
        DeploymentRequestSource.Xtmhub,
        DEPLOYMENT_DATA,
        TIMESTAMP
      );

      // Then
      expect(event.target_product).toBeUndefined();
    });

    it.each([
      {
        deploymentSource: DeploymentRequestSource.Xtmhub,
        expectedSource: TelemetrySource.XTMHUB,
      },
      {
        deploymentSource: DeploymentRequestSource.OpenctiDemo,
        expectedSource: TelemetrySource.DEMO_OPENCTI,
      },
      {
        deploymentSource: DeploymentRequestSource.OpenaevDemo,
        expectedSource: TelemetrySource.DEMO_OPENAEV,
      },
    ])(
      'should set the $expectedSource source when the deployment comes from $deploymentSource',
      ({ deploymentSource, expectedSource }) => {
        // When
        const event = TelemetryHelper.buildCreateDeploymentEvent(
          makeOrganization(),
          USER_ID,
          PlatformIdentifier.Opencti,
          deploymentSource,
          DEPLOYMENT_DATA,
          TIMESTAMP
        );

        // Then
        expect(event.source).toBe(expectedSource);
      }
    );
  });

  describe('buildUpdateDeploymentEvent', () => {
    it('should build the update deployment event with the deployment details', () => {
      // Given
      const deploymentData = {
        deployment_id: DEPLOYMENT_ID,
        deployment_type: DeploymentRequestDeploymentType.Trial,
        start_date: new Date(Date.UTC(2025, 1, 1)),
        end_date: new Date(Date.UTC(2025, 2, 1)),
        platform_id: PLATFORM_ID,
        status: DeploymentRequestHubStatus.Active,
        cancellation_reason: null,
      };

      // When
      const event = TelemetryHelper.buildUpdateDeploymentEvent(
        makeOrganization(),
        USER_ID,
        deploymentData,
        TIMESTAMP
      );

      // Then
      expect(event).toEqual({
        ...PROFESSIONAL_BASE_EVENT,
        ...deploymentData,
        event_type: TelemetryEventType.UPDATE_DEPLOYMENT,
      });
    });
  });

  describe('buildSatisfactionEvent', () => {
    it('should build the reply satisfaction event for the current user and its selected organization', async () => {
      // Given
      vi.useFakeTimers();
      vi.setSystemTime(TIMESTAMP);

      // When
      const event = await TelemetryHelper.buildSatisfactionEvent(
        HasRepliedSatisfaction.No,
        DEPLOYMENT_ID,
        JUSTIFICATION
      );

      // Then
      expect(event).toEqual({
        '@timestamp': TIMESTAMP_ISO,
        event_type: TelemetryEventType.REPLY_SATISFACTION,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: TEST_ORGANIZATIONS.FILIGRAN.NAME,
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: CURRENT_USER.ID,
        email: CURRENT_USER.EMAIL,
        answer: HasRepliedSatisfaction.No,
        justification: JUSTIFICATION,
        deployment_id: DEPLOYMENT_ID,
      });
    });

    it.each([
      {
        description: 'a professional organization',
        selectedOrganizationId: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
        expectedOrganizationType: TelemetryOrganizationType.PROFESSIONAL,
      },
      {
        description: 'its personal space',
        selectedOrganizationId:
          TEST_ORGANIZATIONS.SECOND_ORGANIZATION.USERS.SIMPLE.PERSONAL_SPACE_ID,
        expectedOrganizationType: TelemetryOrganizationType.PERSONAL,
      },
      {
        description: 'an organization that does not exist',
        selectedOrganizationId: uuidv4() as OrganizationId,
        expectedOrganizationType: TelemetryOrganizationType.PUBLIC,
      },
    ])(
      'should flag the organization as $expectedOrganizationType when the user selected $description',
      async ({ selectedOrganizationId, expectedOrganizationType }) => {
        // Given
        requestContext.set({
          user: {
            ...contextSimpleUserSecondOrga.user,
            selected_organization_id: selectedOrganizationId,
          },
        });

        // When
        const event = await TelemetryHelper.buildSatisfactionEvent(
          HasRepliedSatisfaction.Yes,
          DEPLOYMENT_ID
        );

        // Then
        expect(event.organization_type).toBe(expectedOrganizationType);
      }
    );
  });
});
