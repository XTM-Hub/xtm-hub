import { describe, expect, it, vi } from 'vitest';
import { esDbClient } from '../../thirdparty/elasticsearch/client';
import { TelemetryApp } from './telemetry.app';
import { TelemetryOrganizationType, TelemetrySource } from './telemetry.const';
import { LoginEvent, TelemetryEventType } from './telemetry.types';

const { INDEX_PREFIX } = vi.hoisted(() => ({ INDEX_PREFIX: 'hub' }));
const PREFIXED_TELEMETRY_ALIAS = 'hub_telemetry';
const DOCUMENT_ID = 'fakeDocumentId';

// The telemetry alias is resolved when the module loads, so the prefix is set
// through the configuration before any import, as ELASTIC_INDEX_PREFIX would
vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof import('config') }>();
  return {
    default: {
      get: (key: string) =>
        key === 'elasticsearch.index_prefix'
          ? INDEX_PREFIX
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
  it('should index the event in the prefixed telemetry alias when a prefix is configured', async () => {
    // Given
    const indexSpy = vi
      .spyOn(esDbClient, 'index')
      .mockResolvedValue({} as never);

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
