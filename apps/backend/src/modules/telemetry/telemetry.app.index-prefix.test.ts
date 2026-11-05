import type { estypes } from '@elastic/elasticsearch';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { esDbClient as EsDbClient } from '../../thirdparty/elasticsearch/client';
import type { TelemetryApp as TelemetryAppType } from './telemetry.app';
import { TelemetryOrganizationType, TelemetrySource } from './telemetry.const';
import { LoginEvent, TelemetryEventType } from './telemetry.types';

const INDEX_PREFIX = 'hub';
const PREFIXED_TELEMETRY_ALIAS = 'hub_telemetry';
const DOCUMENT_ID = 'fakeDocumentId';

const CREATED_RESPONSE: estypes.WriteResponseBase = {
  _id: 'fakeEventId',
  _index: 'hub_telemetry_v1',
  _version: 1,
  result: 'created',
  _shards: { total: 1, successful: 1, failed: 0 },
  _seq_no: 0,
  _primary_term: 1,
};

// The telemetry alias is resolved when the module loads, and the test setup has
// already loaded the configuration: the prefix is set through the configuration,
// as ELASTIC_INDEX_PREFIX would, then the modules are reloaded
const configuredPrefix = vi.hoisted(() => ({ value: '' }));

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof import('config') }>();
  return {
    default: {
      get: (key: string) =>
        key === 'elasticsearch.index_prefix'
          ? configuredPrefix.value
          : mod.default.get(key),
      has: mod.default.has.bind(mod.default),
    },
  };
});

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn(),
}));

const loginEvent: LoginEvent = {
  event_type: TelemetryEventType.LOGIN,
  organization_id: 'fakeOrgId',
  organization_name: 'fakeOrgName',
  organization_type: TelemetryOrganizationType.PROFESSIONAL,
  user_id: 'fakeUserId',
  '@timestamp': new Date().toISOString(),
  source: TelemetrySource.XTMHUB,
};

describe('telemetryApp with an Elasticsearch index prefix', () => {
  let TelemetryApp: typeof TelemetryAppType;
  let esDbClient: typeof EsDbClient;

  beforeAll(async () => {
    configuredPrefix.value = INDEX_PREFIX;
    vi.resetModules();
    ({ TelemetryApp } = await import('./telemetry.app'));
    ({ esDbClient } = await import('../../thirdparty/elasticsearch/client'));
  });

  it('should index the event in the prefixed telemetry alias when a prefix is configured', async () => {
    // Given
    const indexSpy = vi
      .spyOn(esDbClient, 'index')
      .mockResolvedValue(CREATED_RESPONSE);

    // When
    await TelemetryApp.indexTelemetryEvent(loginEvent);

    // Then
    expect(indexSpy).toHaveBeenCalledExactlyOnceWith({
      index: PREFIXED_TELEMETRY_ALIAS,
      document: loginEvent,
    });
  });

  it.each([TelemetryEventType.DOWNLOAD, TelemetryEventType.SHARE])(
    'should count the %s events in the prefixed telemetry alias when a prefix is configured',
    async (eventType) => {
      // Given
      const countSpy = vi.spyOn(esDbClient, 'count').mockResolvedValue(0);

      // When
      await TelemetryApp.countEventsByDocumentId(eventType, DOCUMENT_ID);

      // Then
      expect(countSpy).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ index: PREFIXED_TELEMETRY_ALIAS })
      );
    }
  );
});
