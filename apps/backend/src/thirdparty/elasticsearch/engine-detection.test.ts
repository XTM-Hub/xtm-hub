import http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decideEngineClient,
  EngineInfo,
  OPENSEARCH_NOT_SUPPORTED_MESSAGE,
  probeEngine,
  resolveEngineClient,
} from './engine-detection';

const ES8_VERSION = '8.19.23';
const ES9_VERSION = '9.5.5';
const ENGINE_USERNAME = 'elastic';
const ENGINE_PASSWORD = 'changeme';
const PROBE_TIMEOUT_MS = 1_000;

const makeEngineInfo = (version: EngineInfo['version']): EngineInfo => ({
  version,
  tagline: 'You Know, for Search',
});

describe('decideEngineClient', () => {
  it.each([
    [
      'Elasticsearch 7',
      makeEngineInfo({ number: '7.17.29' }),
      'elasticsearch8',
    ],
    [
      'Elasticsearch 8',
      makeEngineInfo({ number: ES8_VERSION }),
      'elasticsearch8',
    ],
    [
      'Elasticsearch 9',
      makeEngineInfo({ number: ES9_VERSION }),
      'elasticsearch9',
    ],
    [
      'Elasticsearch 10',
      makeEngineInfo({ number: '10.0.0' }),
      'elasticsearch9',
    ],
    [
      'Elastic Serverless',
      makeEngineInfo({ number: '8.11.0', build_flavor: 'serverless' }),
      'elasticsearch9',
    ],
  ])(
    'should select the right client when the engine is %s',
    (_description, info, expected) => {
      // Given
      // info comes from the dataset

      // When
      const client = decideEngineClient(info);

      // Then
      expect(client).toBe(expected);
    }
  );

  it.each([
    [
      'OpenSearch',
      {
        version: { number: '3.2.0', distribution: 'opensearch' },
        tagline: 'The OpenSearch Project: https://opensearch.org/',
      },
    ],
    [
      'OpenSearch in compatibility mode',
      {
        version: { number: '7.10.2' },
        tagline: 'The OpenSearch Project: https://opensearch.org/',
      },
    ],
  ])('should refuse the engine when it is %s', (_description, info) => {
    // Given
    // info comes from the dataset

    // When
    const decide = () => decideEngineClient(info);

    // Then
    expect(decide).toThrow(OPENSEARCH_NOT_SUPPORTED_MESSAGE);
  });

  it.each([
    ['an unreadable version', makeEngineInfo({ number: 'abc' }), '"abc"'],
    ['an empty version', makeEngineInfo({ number: '' }), '""'],
    ['no version number', makeEngineInfo({}), 'null'],
    ['no version at all', {}, 'null'],
  ])(
    'should refuse the engine when it answers with %s',
    (_description, info, shownVersion) => {
      // Given
      // info comes from the dataset

      // When
      const decide = () => decideEngineClient(info);

      // Then
      expect(decide).toThrow(
        `[ELASTICSEARCH] Search engine answered GET / without a readable version (${shownVersion}): set ELASTIC_ENGINE_CLIENT to elasticsearch8 or elasticsearch9 to force a client`
      );
    }
  );
});

describe('resolveEngineClient', () => {
  it.each([['elasticsearch8' as const], ['elasticsearch9' as const]])(
    'should use the forced client %s without probing the engine',
    async (forced) => {
      // Given
      const probe = vi.fn(async () => makeEngineInfo({ number: ES9_VERSION }));

      // When
      const decision = await resolveEngineClient(forced, probe);

      // Then
      expect({ decision, probed: probe.mock.calls.length }).toEqual({
        decision: { client: forced, source: 'configuration' },
        probed: 0,
      });
    }
  );

  it('should detect the client from the engine when set to auto', async () => {
    // Given
    const probe = async () => makeEngineInfo({ number: ES9_VERSION });

    // When
    const decision = await resolveEngineClient('auto', probe);

    // Then
    expect(decision).toEqual({
      client: 'elasticsearch9',
      version: ES9_VERSION,
      source: 'detection',
    });
  });
});

describe('probeEngine', () => {
  let server: http.Server | undefined;

  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve) ?? resolve(null));
    server = undefined;
  });

  // A real HTTP engine on a free local port, answering every request with the handler
  const startEngine = async (
    handler: http.RequestListener
  ): Promise<string> => {
    server = http.createServer(handler);
    await new Promise<void>((resolve) =>
      server?.listen(0, '127.0.0.1', resolve)
    );
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('The test engine has no TCP address');
    }
    return `http://127.0.0.1:${address.port}`;
  };

  const connectionTo = (url: string, username: string | null = null) => ({
    url,
    username,
    password: username ? ENGINE_PASSWORD : null,
    rejectUnauthorized: true,
    timeout: PROBE_TIMEOUT_MS,
  });

  it('should return the engine information when the engine answers GET /', async () => {
    // Given
    const info = makeEngineInfo({ number: ES9_VERSION });
    const url = await startEngine((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(info));
    });

    // When
    const result = await probeEngine(connectionTo(url));

    // Then
    expect(result).toEqual(info);
  });

  it('should send the credentials when a username is configured', async () => {
    // Given
    let authorization: string | undefined;
    const url = await startEngine((request, response) => {
      authorization = request.headers.authorization;
      response.end(JSON.stringify(makeEngineInfo({ number: ES9_VERSION })));
    });

    // When
    await probeEngine(connectionTo(url, ENGINE_USERNAME));

    // Then
    expect(authorization).toBe(
      `Basic ${Buffer.from(`${ENGINE_USERNAME}:${ENGINE_PASSWORD}`).toString('base64')}`
    );
  });

  it('should fail when the engine refuses the probe', async () => {
    // Given
    const url = await startEngine((_request, response) => {
      response.statusCode = 401;
      response.end();
    });

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine refused the version probe (GET /) on ${url}: HTTP 401`
    );
  });

  it('should fail when the engine answers with an unreadable response', async () => {
    // Given
    const url = await startEngine((_request, response) => {
      response.end('<html>proxy error</html>');
    });

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine answered GET / on ${url} with an unreadable response`
    );
  });

  it('should fail when the engine closes the connection after part of the body', async () => {
    // Given
    const url = await startEngine((_request, response) => {
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-length': '1000',
      });
      // Cut only once the partial body is flushed, for the client to get it
      response.write('{"version":', () => response.socket?.destroy());
    });

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine seems down on ${url}`
    );
  });

  it('should fail when the engine stalls in the middle of the body', async () => {
    // Given
    const url = await startEngine((_request, response) => {
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-length': '1000',
      });
      response.write('{"version":');
    });

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine seems down on ${url}`
    );
  });

  it('should fail when the engine does not answer in time', async () => {
    // Given
    const url = await startEngine(() => {
      // never answers
    });

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine seems down on ${url}`
    );
  });

  it('should fail when nothing listens on the engine URL', async () => {
    // Given
    const url = await startEngine(() => {});
    await new Promise((resolve) => server?.close(resolve));
    server = undefined;

    // When
    const probe = probeEngine(connectionTo(url));

    // Then
    await expect(probe).rejects.toThrow(
      `[ELASTICSEARCH] Search engine seems down on ${url}`
    );
  });
});
