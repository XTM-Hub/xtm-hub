import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import ElasticSearchService from './client';
import { EngineClientSetting } from './engine-detection';

const ES8_VERSION = '8.19.23';
const ES9_VERSION = '9.5.5';
const TEST_INDEX = 'client-engine-tests';
const DOCUMENT_COUNT = 3;

interface SeenRequest {
  method?: string;
  url?: string;
  accept?: string;
  authorization?: string;
}

// A fake Elasticsearch on a free local port: it answers GET / with the given
// version and any other call with a body fitting count and search (or never,
// when stalled), and records what it receives.
// The Elastic clients only talk to a server announcing the Elasticsearch product.
const startEngine = async (version: string, stalled = false) => {
  const seen: SeenRequest[] = [];
  const server = http.createServer((request, response) => {
    seen.push({
      method: request.method,
      url: request.url,
      accept: request.headers.accept,
      authorization: request.headers.authorization,
    });
    if (stalled && request.url !== '/') {
      return;
    }
    response.setHeader('content-type', 'application/json');
    response.setHeader('x-elastic-product', 'Elasticsearch');
    const body =
      request.url === '/'
        ? { version: { number: version }, tagline: 'You Know, for Search' }
        : {
            count: DOCUMENT_COUNT,
            hits: { hits: [] },
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          };
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('The test engine has no TCP address');
  }
  return { server, seen, port: address.port };
};

const ENGINE_USERNAME = 'elastic';
const ENGINE_PASSWORD = 'changeme';

const DOCUMENT = { name: 'first' };
const SHORT_REQUEST_TIMEOUT_MS = 200;

// One call per method of the service, each reaching the engine once
const SERVICE_CALLS: [
  string,
  (service: ElasticSearchService) => Promise<unknown>,
][] = [
  [
    'getIndices',
    (service) => service.getIndices().exists({ index: TEST_INDEX }),
  ],
  ['search', (service) => service.search({ index: TEST_INDEX })],
  [
    'simpleSearch',
    (service) => service.simpleSearch({ index: TEST_INDEX, size: 1 }),
  ],
  [
    'create',
    (service) =>
      service.create({ index: TEST_INDEX, id: '1', document: DOCUMENT }),
  ],
  [
    'index',
    (service) =>
      service.index({ index: TEST_INDEX, id: '1', document: DOCUMENT }),
  ],
  ['delete', (service) => service.delete({ index: TEST_INDEX, id: '1' })],
  ['updateByQuery', (service) => service.updateByQuery({ index: TEST_INDEX })],
  [
    'bulk',
    (service) =>
      service.bulk({
        operations: [{ index: { _index: TEST_INDEX } }, DOCUMENT],
      }),
  ],
  [
    'deleteByQuery',
    (service) =>
      service.deleteByQuery({ index: TEST_INDEX, query: { match_all: {} } }),
  ],
  ['count', (service) => service.count({ index: TEST_INDEX })],
];

const countRequestAccept = (seen: SeenRequest[]) =>
  seen.find((request) => request.url?.includes('_count'))?.accept;

describe('elasticSearchService engine client', () => {
  const originalConfig = { ...portalConfig.elasticsearch };
  let engine: Awaited<ReturnType<typeof startEngine>> | undefined;

  const useEngine = async (
    version: string,
    engineClient: EngineClientSetting,
    stalled = false
  ) => {
    engine = await startEngine(version, stalled);
    portalConfig.elasticsearch.protocol = 'http';
    portalConfig.elasticsearch.host = '127.0.0.1';
    portalConfig.elasticsearch.port = engine.port;
    portalConfig.elasticsearch.username = null;
    portalConfig.elasticsearch.password = null;
    portalConfig.elasticsearch.engine_client = engineClient;
    return engine;
  };

  beforeEach(() => {
    globalThis.xtmHubEngineClient = undefined;
  });

  afterEach(async () => {
    Object.assign(portalConfig.elasticsearch, originalConfig);
    globalThis.xtmHubEngineClient = undefined;
    const server = engine?.server;
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    engine = undefined;
  });

  it.each([
    [ES8_VERSION, 'compatible-with=8'],
    [ES9_VERSION, 'compatible-with=9'],
  ])(
    'should talk to the engine with the client of its major when detecting Elasticsearch %s',
    async (version, compatibility) => {
      // Given
      const { seen } = await useEngine(version, 'auto');
      const service = new ElasticSearchService();

      // When
      await service.init();
      await service.count({ index: TEST_INDEX });

      // Then
      expect(countRequestAccept(seen)).toContain(compatibility);
    }
  );

  it.each([
    ['elasticsearch8' as const, 'compatible-with=8'],
    ['elasticsearch9' as const, 'compatible-with=9'],
  ])(
    'should talk to the engine with the forced client when set to %s',
    async (engineClient, compatibility) => {
      // Given: an engine whose version would pick the other client
      const { seen } = await useEngine(
        engineClient === 'elasticsearch8' ? ES9_VERSION : ES8_VERSION,
        engineClient
      );
      const service = new ElasticSearchService();

      // When
      await service.init();
      await service.count({ index: TEST_INDEX });

      // Then
      expect(countRequestAccept(seen)).toContain(compatibility);
    }
  );

  it('should not probe the engine when the client is forced', async () => {
    // Given
    const { seen } = await useEngine(ES9_VERSION, 'elasticsearch9');
    const service = new ElasticSearchService();

    // When
    const decision = await service.init();

    // Then
    expect({ decision, requests: seen.length }).toEqual({
      decision: { client: 'elasticsearch9', source: 'configuration' },
      requests: 0,
    });
  });

  it.each([
    [ES8_VERSION, 1],
    [ES9_VERSION, 0],
  ])(
    'should warn about the deprecation when detecting Elasticsearch %s only below 9',
    async (version, expectedWarnings) => {
      // Given
      await useEngine(version, 'auto');
      const warn = vi.spyOn(logApp, 'warn');
      const service = new ElasticSearchService();

      // When
      await service.init();

      // Then
      expect(
        warn.mock.calls.filter(([message]) =>
          String(message).includes('older than 9 are deprecated')
        )
      ).toHaveLength(expectedWarnings);
    }
  );

  it('should give the client chosen at startup to a copy created afterwards', async () => {
    // Given: in production each ES migration bundles its own copy of the
    // service, created apart from the one the server initializes
    const { seen } = await useEngine(ES9_VERSION, 'auto');
    await new ElasticSearchService().init();
    const migrationCopy = new ElasticSearchService();

    // When
    const count = await migrationCopy.count({ index: TEST_INDEX });

    // Then
    expect({ count, accept: countRequestAccept(seen) }).toEqual({
      count: DOCUMENT_COUNT,
      accept: expect.stringContaining('compatible-with=9'),
    });
  });

  it.each(SERVICE_CALLS)(
    'should send %s through the client chosen at startup',
    async (_method, call) => {
      // Given
      const { seen } = await useEngine(ES8_VERSION, 'elasticsearch9');
      const service = new ElasticSearchService();
      await service.init();

      // When
      await call(service);

      // Then
      expect(seen.map((request) => request.accept)).toEqual([
        expect.stringContaining('compatible-with=9'),
      ]);
    }
  );

  it.each(['elasticsearch8' as const, 'elasticsearch9' as const])(
    'should give up on a call after the configured request timeout with the %s client',
    async (engineClient) => {
      // Given: an engine that never answers
      await useEngine(ES9_VERSION, engineClient, true);
      portalConfig.elasticsearch.request_timeout = SHORT_REQUEST_TIMEOUT_MS;
      const service = new ElasticSearchService();
      await service.init();

      // When
      const count = service.count({ index: TEST_INDEX });

      // Then
      await expect(count).rejects.toMatchObject({ name: 'TimeoutError' });
    }
  );

  it('should send the configured credentials when talking to the engine', async () => {
    // Given
    const { seen } = await useEngine(ES9_VERSION, 'elasticsearch9');
    portalConfig.elasticsearch.username = ENGINE_USERNAME;
    portalConfig.elasticsearch.password = ENGINE_PASSWORD;
    const service = new ElasticSearchService();
    await service.init();

    // When
    await service.count({ index: TEST_INDEX });

    // Then
    expect(seen[0]?.authorization).toBe(
      `Basic ${Buffer.from(`${ENGINE_USERNAME}:${ENGINE_PASSWORD}`).toString('base64')}`
    );
  });

  it('should refuse a call when no client was chosen yet', async () => {
    // Given
    const service = new ElasticSearchService();

    // When
    const count = service.count({ index: TEST_INDEX });

    // Then
    await expect(count).rejects.toThrow(
      '[ELASTICSEARCH] Client used before ElasticSearchService.init()'
    );
  });
});
