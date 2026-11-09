'use strict';

import knex from 'knex';
import { baseConfig } from '../../knexconfig';
import {
  TelemetryEventService,
  TelemetryEventServiceType,
  TelemetrySource,
} from '../modules/telemetry/telemetry.const';
import { TelemetryEventType } from '../modules/telemetry/telemetry.types';
import { esDbClient } from '../thirdparty/elasticsearch/client';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix';

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface Doc {
  id: string;
  name: string;
  download_number: number;
  share_number: number;
  type: string;
}

const event_timestamp = new Date(Date.UTC(2025, 0, 1));

async function buildDocumentList(
  downloaded_docs: Doc[],
  event_type: 'download' | 'share'
) {
  const result = await esDbClient.search({
    index: withIndexPrefix('telemetry_v1'),
    size: 0,
    query: {
      term: {
        event_type: event_type,
      },
    },
    aggs: {
      event_by_resource: {
        terms: {
          field: 'resource_id',
          size: 10000,
        },
      },
    },
  });

  const agg = result.aggregations?.event_by_resource as {
    buckets: TermsBucket[];
  };
  const buckets: TermsBucket[] = agg?.buckets || [];

  const already_created_events = new Map(
    buckets.map((bucket) => [bucket.key, bucket.doc_count])
  );

  return downloaded_docs.flatMap((doc: Doc) => {
    const alreadyCreated = already_created_events.get(doc.id) || 0;
    const totalCount = event_type ? doc.download_number : doc.share_number;
    const newEventsCount = Math.max(0, totalCount - alreadyCreated);

    const service =
      doc.type === 'csv_feed'
        ? TelemetryEventService.INTEGRATIONS_LIBRARY
        : doc.type === 'custom_dashboard'
          ? TelemetryEventService.CUSTOM_DASHBOARDS_LIBRARY
          : TelemetryEventService.OPENAEV_SCENARIOS_LIBRARY;

    const serviceType =
      doc.type === 'csv_feed' ? TelemetryEventServiceType.CSV_FEEDS : undefined;

    const events: NonNullable<
      Parameters<typeof esDbClient.bulk>[0]['operations']
    > = [];
    for (let i = 0; i < newEventsCount; i++) {
      events.push(
        { index: { _index: withIndexPrefix('telemetry_v1') } },
        {
          '@timestamp': event_timestamp,
          event_type:
            event_type === 'share'
              ? TelemetryEventType.SHARE
              : TelemetryEventType.DOWNLOAD,
          organization_type: event_type === 'share' ? 'Public' : undefined,
          source: TelemetrySource.XTMHUB,
          service: service,
          service_type: serviceType,
          resource_id: doc.id,
          resource_title: doc.name,
        }
      );
    }
    return events;
  });
}

export const up = async function (next: () => void) {
  const database = knex(baseConfig);

  const columnExists = await database.schema.hasColumn(
    'Document',
    'download_number'
  );
  if (columnExists) {
    const docs = await database('Document')
      .where('download_number', '>', 0)
      .orWhere('share_number', '>', 0)
      .select('id', 'name', 'download_number', 'share_number', 'type');

    if (docs.length > 0) {
      const downloadDocToInsert = await buildDocumentList(docs, 'download');
      const shareDocToInsert = await buildDocumentList(docs, 'share');

      if (downloadDocToInsert.length > 0 || shareDocToInsert.length > 0) {
        await esDbClient.bulk({
          refresh: true,
          operations: [...downloadDocToInsert, ...shareDocToInsert],
        });
      }
    }
  }

  next();
};

export const down = async function (next: () => void) {
  await esDbClient.deleteByQuery({
    index: withIndexPrefix('telemetry_v1'),
    query: {
      bool: {
        must: [
          { terms: { event_type: ['share', 'download'] } },
          { term: { '@timestamp': event_timestamp.toISOString() } },
        ],
      },
    },
  });

  next();
};
