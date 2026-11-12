import { Client, ClientOptions } from '@elastic/elasticsearch';
import { Client as ClientV9 } from '@elastic/elasticsearch-v9';

import fs from 'fs';
import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import {
  BulkRequest,
  BulkResponse,
  CountRequest,
  CreateRequest,
  CreateResponse,
  DeleteByQueryRequest,
  DeleteByQueryResponse,
  DeleteRequest,
  DeleteResponse,
  EngineApi,
  IndexRequest,
  IndexResponse,
  IndicesApi,
  LegacyPutMappingRequest,
  PutMappingRequest,
  QueryContainer,
  SearchRequest,
  SearchResponse,
  Sort,
  UpdateByQueryRequest,
  UpdateByQueryResponse,
} from './engine-api';
import {
  ENGINE_PROBE_TIMEOUT_MS,
  EngineClient,
  EngineDecision,
  probeEngine,
  resolveEngineClient,
} from './engine-detection';

declare global {
  // The client chosen by ElasticSearchService.init(). ES migrations are bundled
  // apart from the server in production (builder/prod/prod.js), each with its
  // own copy of this module: they read the choice from here.
  var xtmHubEngineClient: EngineClient | undefined;
}

const endpoint = () =>
  `${portalConfig.elasticsearch.protocol}://${portalConfig.elasticsearch.host}:${portalConfig.elasticsearch.port}`;

const readCa = () => {
  const ca_path = portalConfig.elasticsearch.tls.ca_path;
  return ca_path ? fs.readFileSync(ca_path) : undefined;
};

const createClient = (engineClient: EngineClient): EngineApi => {
  // Only the options both client majors share: their full ClientOptions types
  // come from two incompatible transports
  const config: Pick<
    ClientOptions,
    'node' | 'auth' | 'tls' | 'requestTimeout'
  > = {
    node: endpoint(),
    // The 9.x client has no default: without it a stalled engine would
    // hang every call
    requestTimeout: portalConfig.elasticsearch.request_timeout,
  };

  if (
    portalConfig.elasticsearch.username &&
    portalConfig.elasticsearch.password
  ) {
    config.auth = {
      username: portalConfig.elasticsearch.username,
      password: portalConfig.elasticsearch.password,
    };
  }
  config.tls = {
    ca: readCa(),
    rejectUnauthorized: portalConfig.elasticsearch.tls.reject_unauthorized,
  };
  // Both clients satisfy EngineApi as they are (engine-api.ts)
  return engineClient === 'elasticsearch9'
    ? new ClientV9(config)
    : new Client(config);
};

const isLegacyPutMapping = (
  params: PutMappingRequest | LegacyPutMappingRequest
): params is LegacyPutMappingRequest =>
  'body' in params && params.body !== undefined;

const logEngineDecision = (decision: EngineDecision) => {
  if (decision.source === 'configuration') {
    logApp.info(
      `[ELASTICSEARCH] Search engine client ${decision.client} selected, forced by elasticsearch.engine_client`
    );
    return;
  }
  logApp.info(
    `[ELASTICSEARCH] Search engine client ${decision.client} selected, detected from Elasticsearch ${decision.version ?? 'unknown'}`
  );
  if (decision.client === 'elasticsearch8') {
    logApp.warn(
      '[ELASTICSEARCH] Elasticsearch versions older than 9 are deprecated and their support will be removed in a future release: upgrade the cluster to Elasticsearch 9'
    );
  }
};

class ElasticSearchService {
  private elasticsearchClient: EngineApi | undefined;

  // Chooses the client of the engine's major (engine-detection.ts): must run
  // once at startup, before any other call
  async init(): Promise<EngineDecision> {
    const decision = await resolveEngineClient(
      portalConfig.elasticsearch.engine_client,
      () =>
        probeEngine({
          url: endpoint(),
          username: portalConfig.elasticsearch.username,
          password: portalConfig.elasticsearch.password,
          ca: readCa(),
          rejectUnauthorized:
            portalConfig.elasticsearch.tls.reject_unauthorized,
          timeout: ENGINE_PROBE_TIMEOUT_MS,
        })
    );
    globalThis.xtmHubEngineClient = decision.client;
    this.elasticsearchClient = createClient(decision.client);
    logEngineDecision(decision);
    return decision;
  }

  private get client(): EngineApi {
    if (!this.elasticsearchClient) {
      if (!globalThis.xtmHubEngineClient) {
        throw new Error(
          '[ELASTICSEARCH] Client used before ElasticSearchService.init()'
        );
      }
      this.elasticsearchClient = createClient(globalThis.xtmHubEngineClient);
    }
    return this.elasticsearchClient;
  }

  getIndices(): IndicesApi {
    const indices = this.client.indices;
    return {
      create: (params) => indices.create(params),
      delete: (params) => indices.delete(params),
      exists: (params) => indices.exists(params),
      putIndexTemplate: (params) => indices.putIndexTemplate(params),
      deleteIndexTemplate: (params) => indices.deleteIndexTemplate(params),
      // Sent at the top level whatever the shape: the same request for both
      // majors, without touching the ES migrations
      putMapping: (params) =>
        indices.putMapping(
          isLegacyPutMapping(params)
            ? { index: params.index, ...params.body }
            : params
        ),
    };
  }
  async search<T = unknown>(params: SearchRequest): Promise<SearchResponse<T>> {
    try {
      return this.client.search<T>(params);
    } catch (error) {
      logApp.error('ES search error', { error });
      throw error;
    }
  }

  async simpleSearch<T = unknown>({
    index,
    query,
    sort,
    size = 10,
  }: {
    index: string;
    query?: QueryContainer;
    sort?: Sort;
    size: number;
  }): Promise<T[]> {
    const result = await this.search<T>({
      index,
      query,
      size,
      sort,
    });

    return result.hits.hits.flatMap((hit) =>
      hit._source !== undefined ? [hit._source] : []
    );
  }

  async create<T = unknown>(params: CreateRequest<T>): Promise<CreateResponse> {
    try {
      return this.client.create<T>(params);
    } catch (error) {
      logApp.error('ES create error', { error });
      throw error;
    }
  }

  async index<T = unknown>(params: IndexRequest<T>): Promise<IndexResponse> {
    try {
      return this.client.index<T>(params);
    } catch (error) {
      logApp.error('ES index error', { error });
      throw error;
    }
  }

  async delete(params: DeleteRequest): Promise<DeleteResponse> {
    try {
      return this.client.delete(params);
    } catch (error) {
      logApp.error('ES delete error', { error });
      throw error;
    }
  }
  async updateByQuery(
    params: UpdateByQueryRequest
  ): Promise<UpdateByQueryResponse> {
    try {
      return this.client.updateByQuery(params);
    } catch (error) {
      logApp.error('ES updateByQuery error', { error });
      throw error;
    }
  }
  async bulk(params: BulkRequest): Promise<BulkResponse> {
    try {
      return this.client.bulk(params);
    } catch (error) {
      logApp.error('ES bulk error', { error });
      throw error;
    }
  }

  async deleteByQuery(
    params: DeleteByQueryRequest
  ): Promise<DeleteByQueryResponse> {
    try {
      return this.client.deleteByQuery(params);
    } catch (error) {
      logApp.error('ES deleteByQuery error', { error });
      throw error;
    }
  }

  async count(params: CountRequest): Promise<number> {
    try {
      const result = await this.client.count(params);
      return result.count;
    } catch (error) {
      logApp.error('ES count error', { error });
      throw error;
    }
  }
}

export default ElasticSearchService;

export const esDbClient = new ElasticSearchService();
