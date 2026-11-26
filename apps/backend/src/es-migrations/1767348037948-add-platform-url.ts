'use strict';

import knex from 'knex';
import { baseConfig } from '../../knexconfig.js';
import { esDbClient } from '../thirdparty/elasticsearch/client.js';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix.js';
import { logApp } from '../utils/app-logger.util';

export const up = async function (next: () => void) {
  await esDbClient.getIndices().putIndexTemplate({
    name: withIndexPrefix('telemetry-template'),
    index_patterns: [withIndexPrefix('telemetry_v*')], // Will match telemetry_v1, telemetry_v2, etc., after the index prefix
    template: {
      mappings: {
        properties: {
          event_type: {
            type: 'keyword',
          },
          organization_id: {
            type: 'keyword',
          },
          organization_name: {
            type: 'keyword',
          },
          user_id: {
            type: 'keyword',
          },
          '@timestamp': {
            type: 'date',
            format: 'strict_date_time',
          },
          source: {
            type: 'keyword',
          },
          service: {
            type: 'keyword',
          },
          service_type: {
            type: 'keyword',
          },
          resource_id: {
            type: 'keyword',
          },
          resource_title: {
            type: 'text',
          },
          status: {
            type: 'keyword',
          },
          target_product: {
            type: 'keyword',
          },
          platform_id: {
            type: 'keyword',
          },
          organization_type: {
            type: 'keyword',
          },
          platform_contract: {
            type: 'keyword',
          },
          platform_version: {
            type: 'keyword',
          },
          domains: {
            type: 'keyword',
          },
          activity_sector: {
            type: 'keyword',
          },
          deployment_id: {
            type: 'keyword',
          },
          deployment_type: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
          job_title: {
            type: 'keyword',
          },
          region: {
            type: 'keyword',
          },
          use_case: {
            type: 'keyword',
          },
          cancellation_reason: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          platform_url: {
            type: 'keyword',
          },
        },
      },
      aliases: {
        [withIndexPrefix('telemetry')]: {},
      },
    },
    priority: 100,
    version: 1,
    _meta: {
      description: 'Template for telemetry indices',
      created_by: 'migration',
    },
  });

  await esDbClient.getIndices().putMapping({
    index: withIndexPrefix('telemetry_v1'),
    body: {
      properties: {
        platform_url: {
          type: 'keyword',
        },
      },
    },
  });

  try {
    const database = knex(baseConfig);

    interface PlatformData {
      platform_id: string;
      platform_url: string;
    }
    const platformData = (await database('PlatformConfiguration')
      .distinct('platform_id', 'platform_url')
      .whereNotNull('platform_id')
      .whereNotNull('platform_url')) as PlatformData[];
    logApp.info(
      `Updating register events related to ${platformData.length} platforms`
    );

    for (const { platform_id, platform_url } of platformData) {
      try {
        await esDbClient.updateByQuery({
          index: withIndexPrefix('telemetry_v1'),
          refresh: true,
          conflicts: 'proceed',
          script: {
            source: 'ctx._source.platform_url = params.platform_url',
            params: {
              platform_url: platform_url,
            },
          },
          query: {
            bool: {
              must: [
                { term: { event_type: 'register' } },
                { term: { platform_id: platform_id } },
              ],
            },
          },
        });
      } catch (error) {
        logApp.error(`Error updating platform_id ${platform_id}:`, { error });
      }
    }
  } catch (error) {
    logApp.error('Unable to update register events', { error });
  }
  next();
};

export const down = async function (next: () => void) {
  await esDbClient.updateByQuery({
    index: withIndexPrefix('telemetry_v1'),
    refresh: true,
    conflicts: 'proceed',
    script: {
      source: 'ctx._source.remove("platform_url")',
    },
    query: {
      bool: {
        must: [
          { term: { event_type: 'register' } },
          { exists: { field: 'platform_url' } },
        ],
      },
    },
  });

  await esDbClient.getIndices().putIndexTemplate({
    name: withIndexPrefix('telemetry-template'),
    index_patterns: [withIndexPrefix('telemetry_v*')], // Will match telemetry_v1, telemetry_v2, etc., after the index prefix
    template: {
      mappings: {
        properties: {
          event_type: {
            type: 'keyword',
          },
          organization_id: {
            type: 'keyword',
          },
          organization_name: {
            type: 'keyword',
          },
          user_id: {
            type: 'keyword',
          },
          '@timestamp': {
            type: 'date',
            format: 'strict_date_time',
          },
          source: {
            type: 'keyword',
          },
          service: {
            type: 'keyword',
          },
          service_type: {
            type: 'keyword',
          },
          resource_id: {
            type: 'keyword',
          },
          resource_title: {
            type: 'text',
          },
          status: {
            type: 'keyword',
          },
          target_product: {
            type: 'keyword',
          },
          platform_id: {
            type: 'keyword',
          },
          organization_type: {
            type: 'keyword',
          },
          platform_contract: {
            type: 'keyword',
          },
          platform_version: {
            type: 'keyword',
          },
          domains: {
            type: 'keyword',
          },
          activity_sector: {
            type: 'keyword',
          },
          deployment_id: {
            type: 'keyword',
          },
          deployment_type: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
          job_title: {
            type: 'keyword',
          },
          region: {
            type: 'keyword',
          },
          use_case: {
            type: 'keyword',
          },
          cancellation_reason: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
        },
      },
      aliases: {
        [withIndexPrefix('telemetry')]: {},
      },
    },
    priority: 100,
    version: 1,
    _meta: {
      description: 'Template for telemetry indices',
      created_by: 'migration',
    },
  });

  next();
};
