import { MockInstance } from '@vitest/spy';
import config from 'config';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import portalConfig from '../../config';
import { esDbClient } from '../../thirdparty/elasticsearch/client';
import { PgBossProducer } from '../../thirdparty/pgboss/producer';
import { TELEMETRY_QUEUES } from '../../thirdparty/pgboss/telemetry.jobs';
import { logApp } from '../../utils/app-logger.util';
import { loadInstanceIdentity } from './telemetry-snapshot.domain';
import { resetHubIdentityCacheForTests, TelemetryApp } from './telemetry.app';
import {
  TelemetryEventService,
  TelemetryEventServiceType,
  TelemetryOrganizationType,
  TelemetrySource,
  TelemetryTargetProduct,
} from './telemetry.const';
import {
  LoginEvent,
  SubscribeEvent,
  TelemetryEventType,
} from './telemetry.types';

import { toGlobalId } from 'graphql-relay/node/node.js';
import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { TestHelper } from '../../../tests/helper/test.helper';
import { SERVICES, TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  DocumentMetadataKeyCode,
  IntegrationType,
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import type { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { DocumentApp } from '../document/document.app';
import { DocumentUploadsHelper } from '../document/document.uploads.helper';
import { ServiceInstanceDomain } from '../service/instance/service-instance.domain';
import { INTEGRATION_SERVICE_INSTANCE_ID } from '../shareable-resource/opencti/integration/integration.model';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

// The event pipeline stamps the durable hub instance identity on every
// event; pin it so assertions do not depend on the test database contents.
vi.mock('./telemetry-snapshot.domain', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('./telemetry-snapshot.domain')>();
  return {
    ...mod,
    loadInstanceIdentity: vi.fn().mockResolvedValue({
      instanceId: 'test-hub-instance-id',
      instanceCreation: '2026-01-01T00:00:00.000Z',
    }),
  };
});

// Mock the ES Client
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(),
}));

const mockWriteResponse = {
  _id: 'mock-id',
  _index: 'mock-index',
  _version: 1,
  result: 'created' as never,
  _shards: { total: 1, successful: 1, failed: 0 },
  _seq_no: 0,
  _primary_term: 1,
};

describe('telemetryApp', () => {
  const minioFileMock = {
    minioName: 'minioFile',
    mimeType: 'mimeType',
    fileName: 'csvfilename',
  };

  const mockFileUpload: FileUpload = {
    filename: 'test-image.png',
    mimetype: 'image/png',
    encoding: '7bit',
    createReadStream: vi.fn(),
  };

  const mockUpload = {
    file: mockFileUpload,
    promise: Promise.resolve(mockFileUpload),
  };

  beforeEach(async () => {
    vi.spyOn(DocumentUploadsHelper, 'processUploads').mockResolvedValue([
      minioFileMock,
    ]);
    await TestHelper.document.delete({});
  });

  describe('sendOneClickDeployEvent', () => {
    it('should send a OneClickDeployEvent with version and with tenant_id', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const platform_id = '916121bf-d246-4a43-8522-24be19537b91';
      const platformServiceInstanceId = '5891d6cf-1737-48bb-8f60-de520a93f2bd';
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformConfigurationByServiceInstanceId'
      ).mockResolvedValue({
        service_instance_id: platformServiceInstanceId as ServiceInstanceId,
        token: '59dea7ba-b3b3-4b42-bb60-6326159dc937',
        platform_id: platform_id,
        platform_url: 'https://testing.oaev.staging.filigran.io/',
        registerer_id: '7de5c830-ed96-45ff-91a7-b384943a4620',
        platform_title: 'Open AEV Instance',
        platform_version: '1.0.0',
        platform_contract: PlatformContract.Ee,
        tenant_id: 'c4a88438-abf8-4a76-8594-6df800434865',
        tenant_name: 'tenant_name',
        status: PlatformConfigurationStatus.Active,
        last_connectivity_check: new Date(),
      });

      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });
      expect(document).toBeDefined();

      const documentId = document!.id;

      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await TelemetryApp.sendOneClickDeployEvent({
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        input: {
          platform_identifier: PlatformIdentifier.Opencti,
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          resource_id: documentId,
          resource_title: 'CsvFeed Title',
          platform_service_instance_id: toGlobalId(
            'RegisteredPlatform',
            platformServiceInstanceId
          ),
        },
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.ONE_CLICK_DEPLOY,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: 'Filigran',
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.CSV_FEEDS,
        resource_id: documentId,
        resource_title: 'CsvFeed Title',
        platform_id: platform_id,
        platform_version: '1.0.0',
        target_product: TelemetryTargetProduct.OPEN_CTI,
        tenant_id: 'c4a88438-abf8-4a76-8594-6df800434865',
      });

      const [deployment] = await TestHelper.oneClickDeployment.loadAll({
        resource_id: documentId,
      });
      expect(deployment).toBeDefined();
      expect(deployment.platform_id).toBe(platform_id);
      expect(deployment.tenant_id).toBe('c4a88438-abf8-4a76-8594-6df800434865');
      expect(deployment.user_id).toBe(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID
      );
    });
    it('should send a OneClickDeployEvent without version and without tenant_id', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);

      const platformId = '916121bf-d246-4a43-8522-24be19537b91';
      const platformServiceInstanceId = '5891d6cf-1737-48bb-8f60-de520a93f2bd';
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformConfigurationByServiceInstanceId'
      ).mockResolvedValue({
        service_instance_id: platformServiceInstanceId as ServiceInstanceId,
        token: '59dea7ba-b3b3-4b42-bb60-6326159dc937',
        platform_id: platformId,
        platform_url: 'https://testing.oaev.staging.filigran.io/',
        registerer_id: '7de5c830-ed96-45ff-91a7-b384943a4620',
        platform_title: 'Open AEV Instance',
        platform_contract: PlatformContract.Ee,
        tenant_id: null,
        tenant_name: null,
        platform_version: null,
        status: PlatformConfigurationStatus.Active,
        last_connectivity_check: new Date(),
      });

      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });
      expect(document).toBeDefined();

      const documentId = document!.id;

      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();

      await TelemetryApp.sendOneClickDeployEvent({
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        input: {
          platform_identifier: PlatformIdentifier.Opencti,
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          resource_id: documentId,
          resource_title: 'CsvFeed Title',
          platform_service_instance_id: toGlobalId(
            'RegisteredPlatform',
            platformServiceInstanceId
          ),
        },
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.ONE_CLICK_DEPLOY,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: 'Filigran',
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.CSV_FEEDS,
        resource_id: documentId,
        resource_title: 'CsvFeed Title',
        platform_id: platformId,
        platform_version: undefined,
        tenant_id: undefined,
        target_product: TelemetryTargetProduct.OPEN_CTI,
      });
    });
    it('should send a OneClickDeployEvent connectors with version', async () => {
      vi.useFakeTimers();
      const date = new Date(Date.UTC(2025, 1, 3, 13, 12, 15));
      vi.setSystemTime(date);
      const platform_id = '916121bf-d246-4a43-8522-24be19537b91';
      const platformServiceInstanceId = '5891d6cf-1737-48bb-8f60-de520a93f2bd';
      vi.spyOn(
        ServiceInstanceDomain,
        'loadPlatformConfigurationByServiceInstanceId'
      ).mockResolvedValue({
        service_instance_id: platformServiceInstanceId as ServiceInstanceId,
        token: '59dea7ba-b3b3-4b42-bb60-6326159dc937',
        platform_id: platform_id,
        platform_url: 'https://testing.oaev.staging.filigran.io/',
        registerer_id: '7de5c830-ed96-45ff-91a7-b384943a4620',
        platform_title: 'Open AEV Instance',
        platform_contract: PlatformContract.Ee,
        tenant_name: null,
        tenant_id: null,
        platform_version: '1.0.0',
        status: PlatformConfigurationStatus.Active,
        last_connectivity_check: new Date(),
      });
      const document = await DocumentApp.createDocument({
        input: {
          uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
          name: 'myCsvFeed',
          description: 'description',
          short_description: 'short_description',
          slug: 'slug',
          active: true,
        },
        metadata: [
          {
            key: DocumentMetadataKeyCode.IntegrationType,
            value: IntegrationType.CsvFeed,
          },
          {
            key: DocumentMetadataKeyCode.FeedUrl,
            value: 'https://example.com',
          },
        ],
        serviceInstanceId: INTEGRATION_SERVICE_INSTANCE_ID,
        sourceDocument: mockUpload,
      });
      expect(document).toBeDefined();

      const documentId = document!.id;

      const telemetrySpy = vi
        .spyOn(TelemetryApp, 'sendTelemetryEvent')
        .mockResolvedValue();
      await TelemetryApp.sendOneClickDeployEvent({
        userId: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        input: {
          platform_identifier: PlatformIdentifier.Opencti,
          service_instance_id: SERVICES.INSTANCES.INTEGRATIONS.ID,
          resource_id: documentId,
          resource_title: 'Connector Title',
          platform_service_instance_id: toGlobalId(
            'RegisteredPlatform',
            platformServiceInstanceId
          ),
        },
      });

      expect(telemetrySpy).toHaveBeenCalledExactlyOnceWith({
        '@timestamp': '2025-02-03T13:12:15.000Z',
        event_type: TelemetryEventType.ONE_CLICK_DEPLOY,
        organization_id: TEST_ORGANIZATIONS.FILIGRAN.ID,
        organization_name: 'Filigran',
        organization_type: TelemetryOrganizationType.PROFESSIONAL,
        source: TelemetrySource.XTMHUB,
        user_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        service: TelemetryEventService.INTEGRATIONS_LIBRARY,
        service_type: TelemetryEventServiceType.CSV_FEEDS,
        resource_id: documentId,
        resource_title: 'Connector Title',
        platform_id: platform_id,
        platform_version: '1.0.0',
        target_product: TelemetryTargetProduct.OPEN_CTI,
      });
    });
  });

  describe('sendTelemetryEvent', () => {
    let realConfigGet: typeof config.get;

    beforeAll(() => {
      realConfigGet = vi
        .mocked(config.get)
        .getMockImplementation() as typeof config.get;
    });
    let pgBossSendSpy: MockInstance;
    let indexSpy: MockInstance;
    let logSpy: MockInstance;

    const loginEvent: LoginEvent = {
      event_type: TelemetryEventType.LOGIN,
      organization_id: 'fakeOrgId',
      organization_name: 'fakeOrgName',
      organization_type: TelemetryOrganizationType.PROFESSIONAL,
      user_id: 'fakeUserId',
      '@timestamp': new Date().toISOString(),
      source: TelemetrySource.XTMHUB,
    };

    const subscribeEvent: SubscribeEvent = {
      event_type: TelemetryEventType.SUBSCRIBE,
      organization_id: 'fakeOrgId',
      organization_name: 'fakeOrgName',
      organization_type: TelemetryOrganizationType.PROFESSIONAL,
      user_id: 'fakeUserId',
      '@timestamp': new Date().toISOString(),
      source: TelemetrySource.XTMHUB,
      service: TelemetryEventService.INTEGRATIONS_LIBRARY,
    };

    // sendTelemetryEvent stamps the hub identity before enqueueing/indexing.
    const hubIdentity = {
      hub_instance_id: 'test-hub-instance-id',
      hub_environment: portalConfig.environment,
    };
    const enrichedLoginEvent = { ...loginEvent, ...hubIdentity };
    const enrichedSubscribeEvent = { ...subscribeEvent, ...hubIdentity };

    describe('when queue processing is disabled', () => {
      beforeEach(() => {
        indexSpy = vi
          .spyOn(esDbClient, 'index')
          .mockResolvedValue(mockWriteResponse);
        pgBossSendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        vi.mocked(config.get).mockImplementation((key: string) => {
          if (key === 'telemetry_use_queue_processing') return false;
          if (key === 'telemetry_queued_event_types') return [];
          return realConfigGet(key);
        });
      });

      it('should send directly to Elasticsearch', async () => {
        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(indexSpy).toHaveBeenCalledExactlyOnceWith({
          index: 'telemetry',
          document: enrichedLoginEvent,
        });
        expect(pgBossSendSpy).not.toHaveBeenCalled();
      });

      it('should not throw if there is an error but log an error', async () => {
        indexSpy.mockRejectedValue(new Error('Connection failed'));
        const logErrorSpy = vi.spyOn(logApp, 'error');

        await TelemetryApp.sendTelemetryEvent(loginEvent);
        await Promise.resolve();
        expect(logErrorSpy).toHaveBeenCalledOnce();
        expect(pgBossSendSpy).not.toHaveBeenCalled();
      });
    });

    describe('when queue processing is enabled with empty event types list', () => {
      beforeEach(() => {
        indexSpy = vi
          .spyOn(esDbClient, 'index')
          .mockResolvedValue(mockWriteResponse);
        pgBossSendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        logSpy = vi.spyOn(logApp, 'error');
        vi.mocked(config.get).mockImplementation((key: string) => {
          if (key === 'telemetry_use_queue_processing') return true;
          if (key === 'telemetry_queued_event_types') return [];
          return realConfigGet(key);
        });
      });

      it('should enqueue all events via PgBossProducer', async () => {
        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(pgBossSendSpy).toHaveBeenCalledExactlyOnceWith(
          TELEMETRY_QUEUES.EVENTS,
          { event: enrichedLoginEvent }
        );
        expect(indexSpy).not.toHaveBeenCalled();
      });

      it('should enqueue any event type when list is empty', async () => {
        await TelemetryApp.sendTelemetryEvent(subscribeEvent);

        expect(pgBossSendSpy).toHaveBeenCalledExactlyOnceWith(
          TELEMETRY_QUEUES.EVENTS,
          { event: enrichedSubscribeEvent }
        );
        expect(indexSpy).not.toHaveBeenCalled();
      });

      it('should log error when PgBossProducer.send fails', async () => {
        const sendError = new Error('PgBoss connection lost');
        pgBossSendSpy.mockRejectedValue(sendError);

        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(logSpy).toHaveBeenCalledWith(
          'Failed to enqueue telemetry event',
          { event: enrichedLoginEvent, error: sendError }
        );
        expect(indexSpy).not.toHaveBeenCalled();
      });
    });

    describe('when queue processing is enabled with specific event types', () => {
      beforeEach(() => {
        indexSpy = vi
          .spyOn(esDbClient, 'index')
          .mockResolvedValue(mockWriteResponse);
        pgBossSendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        vi.mocked(config.get).mockImplementation((key: string) => {
          if (key === 'telemetry_use_queue_processing') return true;
          if (key === 'telemetry_queued_event_types')
            return [TelemetryEventType.LOGIN];
          return realConfigGet(key);
        });
      });

      it('should enqueue events whose type is in the list', async () => {
        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(pgBossSendSpy).toHaveBeenCalledExactlyOnceWith(
          TELEMETRY_QUEUES.EVENTS,
          { event: enrichedLoginEvent }
        );
        expect(indexSpy).not.toHaveBeenCalled();
      });

      it('should send directly to ES for events not in the list', async () => {
        await TelemetryApp.sendTelemetryEvent(subscribeEvent);

        expect(indexSpy).toHaveBeenCalledExactlyOnceWith({
          index: 'telemetry',
          document: enrichedSubscribeEvent,
        });
        expect(pgBossSendSpy).not.toHaveBeenCalled();
      });
    });

    describe('hub identity stamping', () => {
      const identityLoadError = new Error('database is down');

      beforeEach(() => {
        resetHubIdentityCacheForTests();
        indexSpy = vi
          .spyOn(esDbClient, 'index')
          .mockResolvedValue(mockWriteResponse);
        pgBossSendSpy = vi
          .spyOn(PgBossProducer, 'send')
          .mockResolvedValue('job-id');
        vi.mocked(config.get).mockImplementation((key: string) => {
          if (key === 'telemetry_use_queue_processing') return false;
          if (key === 'telemetry_queued_event_types') return [];
          return realConfigGet(key);
        });
      });

      afterEach(() => {
        vi.mocked(loadInstanceIdentity).mockResolvedValue({
          instanceId: 'test-hub-instance-id',
          instanceCreation: '2026-01-01T00:00:00.000Z',
        });
        resetHubIdentityCacheForTests();
      });

      it('should load the identity once and reuse it for subsequent events', async () => {
        await TelemetryApp.sendTelemetryEvent(loginEvent);
        await TelemetryApp.sendTelemetryEvent(subscribeEvent);

        expect(loadInstanceIdentity).toHaveBeenCalledOnce();
        expect(indexSpy).toHaveBeenNthCalledWith(1, {
          index: 'telemetry',
          document: enrichedLoginEvent,
        });
        expect(indexSpy).toHaveBeenNthCalledWith(2, {
          index: 'telemetry',
          document: enrichedSubscribeEvent,
        });
      });

      it('should stamp unknown on load failure and not retry within the backoff window', async () => {
        vi.mocked(loadInstanceIdentity).mockRejectedValue(identityLoadError);
        const logErrorSpy = vi.spyOn(logApp, 'error');

        await TelemetryApp.sendTelemetryEvent(loginEvent);
        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(loadInstanceIdentity).toHaveBeenCalledOnce();
        expect(logErrorSpy).toHaveBeenCalledExactlyOnceWith(
          'Failed to load hub instance identity for telemetry',
          { error: identityLoadError }
        );
        expect(indexSpy).toHaveBeenCalledTimes(2);
        expect(indexSpy).toHaveBeenLastCalledWith({
          index: 'telemetry',
          document: {
            ...loginEvent,
            hub_instance_id: 'unknown',
            hub_environment: portalConfig.environment,
          },
        });
      });

      it('should retry the identity load after the backoff window', async () => {
        vi.useFakeTimers();
        vi.mocked(loadInstanceIdentity).mockRejectedValueOnce(
          identityLoadError
        );

        await TelemetryApp.sendTelemetryEvent(loginEvent);
        expect(indexSpy).toHaveBeenLastCalledWith({
          index: 'telemetry',
          document: {
            ...loginEvent,
            hub_instance_id: 'unknown',
            hub_environment: portalConfig.environment,
          },
        });

        vi.advanceTimersByTime(61_000);
        await TelemetryApp.sendTelemetryEvent(loginEvent);

        expect(loadInstanceIdentity).toHaveBeenCalledTimes(2);
        expect(indexSpy).toHaveBeenLastCalledWith({
          index: 'telemetry',
          document: enrichedLoginEvent,
        });
      });
    });
  });

  describe('countEventsByDocumentIds', () => {
    const DOCUMENT_A = 'document-a';
    const DOCUMENT_B = 'document-b';

    it('should not query Elasticsearch when no document id is given', async () => {
      // Given
      const searchSpy = vi.spyOn(esDbClient, 'search');

      // When
      const counts = await TelemetryApp.countEventsByDocumentIds(
        TelemetryEventType.DOWNLOAD,
        []
      );

      // Then
      expect({ size: counts.size, searched: searchSpy.mock.calls.length }).toEqual(
        { size: 0, searched: 0 }
      );
    });

    it('should count the events of every document in one aggregation', async () => {
      // Given
      const searchSpy = vi.spyOn(esDbClient, 'search').mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { hits: [] },
        aggregations: {
          by_resource: {
            buckets: [{ key: DOCUMENT_A, doc_count: 7 }],
          },
        },
      });

      // When
      const counts = await TelemetryApp.countEventsByDocumentIds(
        TelemetryEventType.DOWNLOAD,
        [DOCUMENT_A, DOCUMENT_B]
      );

      // Then
      expect({
        counts: Object.fromEntries(counts),
        query: searchSpy.mock.calls[0]?.[0]?.query,
      }).toEqual({
        counts: { [DOCUMENT_A]: 7 },
        query: {
          bool: {
            filter: [
              { term: { event_type: TelemetryEventType.DOWNLOAD } },
              { terms: { resource_id: [DOCUMENT_A, DOCUMENT_B] } },
            ],
          },
        },
      });
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
  });
});
