import type { estypes } from '@elastic/elasticsearch';
import type { estypes as estypes9 } from '@elastic/elasticsearch-v9';

// The Elasticsearch calls the hub makes, typed so that the 8.x and the 9.x
// clients both satisfy them without a cast: a request must fit the types of
// both majors (intersection), a response is read through the fields either
// may return (union). A request shape only one major accepts fails to compile.
// A new call goes here first, then through ElasticSearchService.

export type SearchRequest = estypes.SearchRequest & estypes9.SearchRequest;
export type SearchResponse<T> =
  estypes.SearchResponse<T> | estypes9.SearchResponse<T>;
export type QueryContainer = estypes.QueryDslQueryContainer &
  estypes9.QueryDslQueryContainer;
export type Sort = estypes.Sort & estypes9.Sort;
export type CreateRequest<T> = estypes.CreateRequest<T> &
  estypes9.CreateRequest<T>;
export type CreateResponse = estypes.CreateResponse | estypes9.CreateResponse;
export type IndexRequest<T> = estypes.IndexRequest<T> &
  estypes9.IndexRequest<T>;
export type IndexResponse = estypes.IndexResponse | estypes9.IndexResponse;
export type DeleteRequest = estypes.DeleteRequest & estypes9.DeleteRequest;
export type DeleteResponse = estypes.DeleteResponse | estypes9.DeleteResponse;
export type UpdateByQueryRequest = estypes.UpdateByQueryRequest &
  estypes9.UpdateByQueryRequest;
export type UpdateByQueryResponse =
  estypes.UpdateByQueryResponse | estypes9.UpdateByQueryResponse;
export type BulkRequest = estypes.BulkRequest & estypes9.BulkRequest;
export type BulkResponse = estypes.BulkResponse | estypes9.BulkResponse;
export type DeleteByQueryRequest = estypes.DeleteByQueryRequest &
  estypes9.DeleteByQueryRequest;
export type DeleteByQueryResponse =
  estypes.DeleteByQueryResponse | estypes9.DeleteByQueryResponse;
export type CountRequest = estypes.CountRequest & estypes9.CountRequest;
export type CountResponse = estypes.CountResponse | estypes9.CountResponse;

export type PutMappingRequest = estypes.IndicesPutMappingRequest &
  estypes9.IndicesPutMappingRequest;
// The mapping under `body`, as the ES migrations written for the 8.x client
// pass it: the 9.x types refuse that key
export interface LegacyPutMappingRequest {
  index: PutMappingRequest['index'];
  body: Omit<PutMappingRequest, 'index'>;
}

export interface EngineIndicesApi {
  create(
    params: estypes.IndicesCreateRequest & estypes9.IndicesCreateRequest
  ): Promise<estypes.IndicesCreateResponse | estypes9.IndicesCreateResponse>;
  delete(
    params: estypes.IndicesDeleteRequest & estypes9.IndicesDeleteRequest
  ): Promise<estypes.IndicesDeleteResponse | estypes9.IndicesDeleteResponse>;
  exists(
    params: estypes.IndicesExistsRequest & estypes9.IndicesExistsRequest
  ): Promise<boolean>;
  putIndexTemplate(
    params: estypes.IndicesPutIndexTemplateRequest &
      estypes9.IndicesPutIndexTemplateRequest
  ): Promise<
    | estypes.IndicesPutIndexTemplateResponse
    | estypes9.IndicesPutIndexTemplateResponse
  >;
  deleteIndexTemplate(
    params: estypes.IndicesDeleteIndexTemplateRequest &
      estypes9.IndicesDeleteIndexTemplateRequest
  ): Promise<
    | estypes.IndicesDeleteIndexTemplateResponse
    | estypes9.IndicesDeleteIndexTemplateResponse
  >;
  putMapping(
    params: PutMappingRequest
  ): Promise<
    estypes.IndicesPutMappingResponse | estypes9.IndicesPutMappingResponse
  >;
}

export interface EngineApi {
  indices: EngineIndicesApi;
  search<T>(params: SearchRequest): Promise<SearchResponse<T>>;
  create<T>(params: CreateRequest<T>): Promise<CreateResponse>;
  index<T>(params: IndexRequest<T>): Promise<IndexResponse>;
  delete(params: DeleteRequest): Promise<DeleteResponse>;
  updateByQuery(params: UpdateByQueryRequest): Promise<UpdateByQueryResponse>;
  bulk(params: BulkRequest): Promise<BulkResponse>;
  deleteByQuery(params: DeleteByQueryRequest): Promise<DeleteByQueryResponse>;
  count(params: CountRequest): Promise<CountResponse>;
}

// What ElasticSearchService.getIndices() offers: putMapping also takes the
// legacy shape
export type IndicesApi = Omit<EngineIndicesApi, 'putMapping'> & {
  putMapping(
    params: PutMappingRequest | LegacyPutMappingRequest
  ): ReturnType<EngineIndicesApi['putMapping']>;
};
