import knex from 'knex';
import { baseConfig } from '../../knexconfig.js';
import { esDbClient } from '../thirdparty/elasticsearch/client';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix';

export const up = async function (next: () => void) {
  const database = knex(baseConfig);

  const result = await esDbClient.search({
    index: withIndexPrefix('telemetry_v1'),
    size: 0,
    query: {
      terms: { event_type: ['share', 'download'] },
    },
    aggs: {
      distinct_resources: {
        terms: {
          field: 'resource_id',
          size: 10000,
        },
      },
    },
  });

  const agg = result.aggregations?.distinct_resources as {
    buckets: Array<{ key: string; doc_count: number }>;
  };
  const distinctDocumentIds: string[] =
    agg?.buckets?.map((bucket) => bucket.key) || [];

  const docs = await database('Document')
    .whereIn('id', distinctDocumentIds)
    .select('id', 'name');

  if (docs.length > 0) {
    const updatePromises = docs.map((doc) =>
      esDbClient.updateByQuery({
        index: withIndexPrefix('telemetry_v1'),
        query: {
          bool: {
            must: [
              { terms: { event_type: ['share', 'download'] } },
              { term: { resource_id: doc.id } },
            ],
          },
        },
        script: {
          source: 'ctx._source.resource_title = params.new_title',
          params: {
            new_title: doc.name,
          },
        },
      })
    );

    await Promise.all(updatePromises);
  }

  next();
};

export const down = async function (next: () => void) {
  const database = knex(baseConfig);

  const result = await esDbClient.search({
    index: withIndexPrefix('telemetry_v1'),
    size: 0,
    query: {
      terms: { event_type: ['share', 'download'] },
    },
    aggs: {
      distinct_resources: {
        terms: {
          field: 'resource_id',
          size: 10000,
        },
      },
    },
  });

  const agg = result.aggregations?.distinct_resources as {
    buckets: Array<{ key: string; doc_count: number }>;
  };
  const distinctDocumentIds: string[] =
    agg?.buckets?.map((bucket) => bucket.key) || [];

  const docs = await database('Document')
    .whereIn('id', distinctDocumentIds)
    .select('id', 'file_name');

  if (docs.length > 0) {
    const updatePromises = docs.map((doc) =>
      esDbClient.updateByQuery({
        index: withIndexPrefix('telemetry_v1'),
        query: {
          bool: {
            must: [
              { terms: { event_type: ['share', 'download'] } },
              { term: { resource_id: doc.id } },
            ],
          },
        },
        script: {
          source: 'ctx._source.resource_title = params.new_title',
          params: {
            new_title: doc.file_name,
          },
        },
      })
    );

    await Promise.all(updatePromises);
  }

  next();
};
