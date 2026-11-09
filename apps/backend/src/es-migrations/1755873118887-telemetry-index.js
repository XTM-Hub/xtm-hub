'use strict';

import { esDbClient } from '../thirdparty/elasticsearch/client.ts';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix.ts';

export const up = async function (next) {
  try {
    // 1. Create index template
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

    // 2. Create the first index (telemetry_v1)
    await esDbClient.getIndices().create({
      index: withIndexPrefix('telemetry_v1'),
      // Settings and mappings will come from the template
    });

    next();
  } catch (error) {
    next(error);
  }
};

export const down = async function (next) {
  try {
    // Delete the index (this will also remove the alias)
    await esDbClient.getIndices().delete({
      index: withIndexPrefix('telemetry_v1'),
      ignore_unavailable: true,
    });

    // Delete the template
    await esDbClient.getIndices().deleteIndexTemplate({
      name: withIndexPrefix('telemetry-template'),
    });

    next();
  } catch (error) {
    next(error);
  }
};
