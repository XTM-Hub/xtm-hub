'use strict';

import { esDbClient } from '../thirdparty/elasticsearch/client.js';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix.js';

export const up = async function (next) {
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
        platform_version: {
          type: 'keyword',
        },
      },
    },
  });

  next();
};

export const down = async function (next) {
  // only rollback template update. It's not possible to rollback index mappings.
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
