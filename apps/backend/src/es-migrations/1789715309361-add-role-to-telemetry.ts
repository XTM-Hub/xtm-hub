'use strict';

import { esDbClient } from '../thirdparty/elasticsearch/client.js';

const FULL_TEMPLATE_PROPERTIES = {
  event_type: { type: 'keyword' },
  organization_id: { type: 'keyword' },
  organization_name: { type: 'keyword' },
  user_id: { type: 'keyword' },
  '@timestamp': { type: 'date', format: 'strict_date_time' },
  source: { type: 'keyword' },
  service: { type: 'keyword' },
  service_type: { type: 'keyword' },
  resource_id: { type: 'keyword' },
  resource_title: { type: 'text' },
  status: { type: 'keyword' },
  target_product: { type: 'keyword' },
  platform_id: { type: 'keyword' },
  organization_type: { type: 'keyword' },
  platform_contract: { type: 'keyword' },
  platform_version: { type: 'keyword' },
  domains: { type: 'keyword' },
  activity_sector: { type: 'keyword' },
  deployment_id: { type: 'keyword' },
  deployment_type: { type: 'keyword' },
  email: { type: 'keyword' },
  job_title: { type: 'keyword' },
  region: { type: 'keyword' },
  use_case: { type: 'keyword' },
  cancellation_reason: {
    type: 'text',
    fields: {
      keyword: { type: 'keyword', ignore_above: 256 },
    },
  },
  platform_url: { type: 'keyword' },
  existing_users_count: { type: 'integer' },
  tenant_id: { type: 'keyword' },
  hub_instance_id: { type: 'keyword' },
  hub_environment: { type: 'keyword' },
  parent_id: { type: 'keyword' },
} as const;

const NEW_PROPERTIES = {
  role: { type: 'keyword' },
} as const;

const TEMPLATE_CONFIG = {
  aliases: { telemetry: {} },
  priority: 100,
  version: 1,
  _meta: {
    description: 'Template for telemetry indices',
    created_by: 'migration',
  },
};

export const up = async function (next: () => void) {
  await esDbClient.getIndices().putIndexTemplate({
    name: 'telemetry-template',
    index_patterns: ['telemetry_v*'],
    template: {
      mappings: {
        properties: {
          ...FULL_TEMPLATE_PROPERTIES,
          ...NEW_PROPERTIES,
        },
      },
      aliases: TEMPLATE_CONFIG.aliases,
    },
    priority: TEMPLATE_CONFIG.priority,
    version: TEMPLATE_CONFIG.version,
    _meta: TEMPLATE_CONFIG._meta,
  });

  await esDbClient.getIndices().putMapping({
    index: 'telemetry_v1',
    body: {
      properties: NEW_PROPERTIES,
    },
  });

  next();
};

export const down = async function (next: () => void) {
  await esDbClient.getIndices().putIndexTemplate({
    name: 'telemetry-template',
    index_patterns: ['telemetry_v*'],
    template: {
      mappings: {
        properties: FULL_TEMPLATE_PROPERTIES,
      },
      aliases: TEMPLATE_CONFIG.aliases,
    },
    priority: TEMPLATE_CONFIG.priority,
    version: TEMPLATE_CONFIG.version,
    _meta: TEMPLATE_CONFIG._meta,
  });

  next();
};
