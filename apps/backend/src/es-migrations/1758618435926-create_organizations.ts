'use strict';

import knex from 'knex';
import { baseConfig } from '../../knexconfig';
import { TelemetrySource } from '../modules/telemetry/telemetry.const';
import { TelemetryEventType } from '../modules/telemetry/telemetry.types';
import { ADMIN_UUID } from '../portal.const';
import { esDbClient } from '../thirdparty/elasticsearch/client';
import { withIndexPrefix } from '../thirdparty/elasticsearch/index-prefix';

export const up = async function (next: () => void) {
  const database = knex(baseConfig);

  const organizations = await database('Organization')
    .where('personal_space', '=', false)
    .select('*');
  if (organizations.length > 0) {
    const events = organizations.flatMap((orga) => [
      { index: { _index: withIndexPrefix('telemetry_v1') } },
      {
        '@timestamp': new Date(2025, 0, 1),
        event_type: TelemetryEventType.CREATE_ORGANIZATION,
        organization_id: orga.id,
        organization_name: orga.name,
        organization_type: 'Professional',
        source: TelemetrySource.XTMHUB,
        user_id: ADMIN_UUID,
        domains: orga.domains,
      },
    ]);

    await esDbClient.bulk({ refresh: true, operations: events });
  }

  next();
};

export const down = async function (next: () => void) {
  await esDbClient.deleteByQuery({
    index: withIndexPrefix('telemetry_v1'),
    query: {
      term: {
        event_type: 'create_organization',
      },
    },
  });

  next();
};
