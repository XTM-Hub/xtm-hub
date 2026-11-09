import http from 'node:http';
import https from 'node:https';

// Decides which Elastic client the hub uses to talk to its search engine, the
// 8.x or the 9.x one, in this order:
//   1. a forced client (elasticsearch.engine_client), trusted as is, without
//      reading the server;
//   2. otherwise a GET / on the engine, read by decideEngineClient.
// Any failure stops the hub: no silent fallback.

export const ENGINE_CLIENT_AUTO = 'auto';
export const ENGINE_CLIENTS = ['elasticsearch8', 'elasticsearch9'] as const;
export type EngineClient = (typeof ENGINE_CLIENTS)[number];
export type EngineClientSetting = typeof ENGINE_CLIENT_AUTO | EngineClient;
export const ENGINE_CLIENT_SETTINGS: readonly EngineClientSetting[] = [
  ENGINE_CLIENT_AUTO,
  ...ENGINE_CLIENTS,
];

export const OPENSEARCH_NOT_SUPPORTED_MESSAGE =
  '[ELASTICSEARCH] OpenSearch is not supported';

// Same as the default request timeout of the Elastic clients
export const ENGINE_PROBE_TIMEOUT_MS = 30_000;

export interface EngineInfo {
  version?: { number?: string; distribution?: string; build_flavor?: string };
  tagline?: string;
}

export interface EngineDecision {
  client: EngineClient;
  // Empty when the client was forced: the server was not read
  version?: string;
  source: 'configuration' | 'detection';
}

export interface EngineConnection {
  url: string;
  username: string | null;
  password: string | null;
  ca?: Buffer;
  rejectUnauthorized: boolean;
  timeout: number;
}

// The answer of GET / decides the client:
//   - OpenSearch announces itself in `distribution`; in compatibility mode
//     `distribution` is hidden and the version reads 7.10.2, but the tagline
//     still names OpenSearch;
//   - Elastic Serverless gets the newest client: its version number is not
//     meaningful, Elastic recommends recognizing it by `build_flavor`;
//   - Elasticsearch 9 and later get the 9.x client. Every other answer,
//     Elasticsearch 8, 7 or an unreadable version, keeps the 8.x client.
export const decideEngineClient = (info: EngineInfo): EngineClient => {
  if (
    info.version?.distribution === 'opensearch' ||
    info.tagline?.includes('OpenSearch')
  ) {
    throw new Error(OPENSEARCH_NOT_SUPPORTED_MESSAGE);
  }
  if (info.version?.build_flavor === 'serverless') {
    return 'elasticsearch9';
  }
  const major = Number.parseInt(info.version?.number ?? '', 10);
  return major >= 9 ? 'elasticsearch9' : 'elasticsearch8';
};

const authorizationHeader = (
  connection: EngineConnection
): Record<string, string> => {
  if (!connection.username) {
    return {};
  }
  const credentials = `${connection.username}:${connection.password ?? ''}`;
  return {
    authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
  };
};

// GET / on the engine, with the same TLS and credentials as the clients
export const probeEngine = (
  connection: EngineConnection
): Promise<EngineInfo> =>
  new Promise((resolve, reject) => {
    const url = new URL(connection.url);
    const request = (url.protocol === 'https:' ? https.request : http.request)(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...authorizationHeader(connection),
        },
        ca: connection.ca,
        rejectUnauthorized: connection.rejectUnauthorized,
        timeout: connection.timeout,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            reject(
              new Error(
                `[ELASTICSEARCH] Search engine refused the version probe (GET /) on ${url.origin}: HTTP ${status}`
              )
            );
            return;
          }
          try {
            const info: EngineInfo = JSON.parse(
              Buffer.concat(chunks).toString('utf8')
            );
            resolve(info);
          } catch (cause) {
            reject(
              new Error(
                `[ELASTICSEARCH] Search engine answered GET / on ${url.origin} with an unreadable response`,
                { cause }
              )
            );
          }
        });
      }
    );
    request.on('timeout', () => {
      request.destroy(new Error(`No answer after ${connection.timeout} ms`));
    });
    request.on('error', (cause) => {
      reject(
        new Error(`[ELASTICSEARCH] Search engine seems down on ${url.origin}`, {
          cause,
        })
      );
    });
    request.end();
  });

export const resolveEngineClient = async (
  setting: EngineClientSetting,
  probe: () => Promise<EngineInfo>
): Promise<EngineDecision> => {
  if (setting !== ENGINE_CLIENT_AUTO) {
    return { client: setting, source: 'configuration' };
  }
  const info = await probe();
  return {
    client: decideEngineClient(info),
    version: info.version?.number,
    source: 'detection',
  };
};
