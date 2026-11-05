import { database } from '../../../knexfile';
import {
  DocumentStatus,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { GaugeObservation } from './telemetry-snapshot.helper';
import { TelemetryTargetProduct } from './telemetry.const';
import { TelemetryTargetProductMappedByPlatformIdentifier } from './telemetry.helper';

/**
 * Gauge (snapshot) queries: aggregate counts over the hub's Postgres,
 * refreshed periodically and exported as OTLP observable gauges. Only
 * low-cardinality dimensions (product / contract / status / type) are
 * emitted - never per-organization or per-user breakdowns.
 *
 * Queries use the raw knex `database` handle (not the request-scoped `db()`
 * helper): they run from a background collector outside any request or
 * transaction context.
 */

const ACTIVE_USER_WINDOW_DAYS = 30;

const RegistrationIdentifierToProduct = new Map<string, TelemetryTargetProduct>(
  [
    [
      ServiceDefinitionIdentifier.OpenctiRegistration,
      TelemetryTargetProduct.OPEN_CTI,
    ],
    [
      ServiceDefinitionIdentifier.OpenaevRegistration,
      TelemetryTargetProduct.OPEN_AEV,
    ],
  ]
);

const toCount = (value: unknown): number => Number(value ?? 0);

const single = async (
  query: Promise<Array<{ value: string | number }>>
): Promise<GaugeObservation[]> => {
  const [row] = await query;
  return [{ value: toCount(row?.value) }];
};

// Knex's builder cannot type select(...) + groupBy(...) + count(...) result
// rows (it only infers the count column), so grouped queries are cast to
// their actual row shape.
type GroupedRow<Columns extends string> = Record<Columns, unknown> & {
  value: string | number;
};

export interface GaugeDefinition {
  name: string;
  description: string;
  collect: () => Promise<GaugeObservation[]>;
}

export const GAUGES: GaugeDefinition[] = [
  {
    name: 'xtm_hub_total_users_count',
    description: 'Total number of users',
    collect: () => single(database('User').count({ value: '*' })),
  },
  {
    name: 'xtm_hub_active_users_count',
    description: `Number of users with a login in the last ${ACTIVE_USER_WINDOW_DAYS} days`,
    collect: () =>
      single(
        database('User')
          .where(
            'last_login',
            '>=',
            database.raw(`now() - interval '${ACTIVE_USER_WINDOW_DAYS} days'`)
          )
          .count({ value: '*' })
      ),
  },
  {
    name: 'xtm_hub_disabled_users_count',
    description: 'Number of disabled users',
    collect: () =>
      single(database('User').where({ disabled: true }).count({ value: '*' })),
  },
  {
    name: 'xtm_hub_pending_users_count',
    description: 'Number of pending organization memberships',
    collect: () =>
      single(database('User_Organization_Pending').count({ value: '*' })),
  },
  {
    name: 'xtm_hub_organizations_count',
    description: 'Total number of organizations',
    collect: () => single(database('Organization').count({ value: '*' })),
  },
  {
    name: 'xtm_hub_organizations_by_type',
    description:
      'Organizations broken down by type (personal space vs professional)',
    collect: async () => {
      const rows = (await database('Organization')
        .select('personal_space')
        .groupBy('personal_space')
        .count({ value: '*' })) as unknown as Array<
        GroupedRow<'personal_space'>
      >;
      return rows.map((row) => ({
        value: toCount(row.value),
        attributes: {
          org_type: row.personal_space ? 'personal' : 'professional',
        },
      }));
    },
  },
  {
    name: 'xtm_hub_registered_platforms_by_identity',
    description:
      'Registered platforms broken down by product, contract and current status - the current-state registration gauge',
    collect: async () => {
      const rows = (await database('PlatformConfiguration as pc')
        .join('ServiceInstance as si', 'pc.service_instance_id', 'si.id')
        .join('ServiceDefinition as sd', 'si.service_definition_id', 'sd.id')
        .whereIn('sd.identifier', [
          ServiceDefinitionIdentifier.OpenctiRegistration,
          ServiceDefinitionIdentifier.OpenaevRegistration,
        ])
        .select('sd.identifier', 'pc.platform_contract', 'pc.status')
        .groupBy('sd.identifier', 'pc.platform_contract', 'pc.status')
        .count({ value: '*' })) as unknown as Array<
        GroupedRow<'identifier' | 'platform_contract' | 'status'>
      >;
      return rows.map((row) => ({
        value: toCount(row.value),
        attributes: {
          product:
            RegistrationIdentifierToProduct.get(String(row.identifier)) ??
            String(row.identifier),
          contract: String(row.platform_contract),
          status: String(row.status),
        },
      }));
    },
  },
  {
    name: 'xtm_hub_trials_by_status',
    description:
      'Trial deployment requests broken down by hub status and target product (ongoing = non-terminal statuses; rows persist, so the sum is the all-time total)',
    collect: async () => {
      const rows = (await database('DeploymentRequest')
        .select('hub_status', 'platform_identifier')
        .groupBy('hub_status', 'platform_identifier')
        .count({ value: '*' })) as unknown as Array<
        GroupedRow<'hub_status' | 'platform_identifier'>
      >;
      return rows.map((row) => ({
        value: toCount(row.value),
        attributes: {
          status: String(row.hub_status),
          product:
            TelemetryTargetProductMappedByPlatformIdentifier.get(
              row.platform_identifier as PlatformIdentifier
            ) ?? String(row.platform_identifier),
        },
      }));
    },
  },
  {
    name: 'xtm_hub_active_subscriptions_by_service',
    description:
      'Active subscriptions (started, not ended) broken down by service definition identifier',
    collect: async () => {
      const rows = (await database('Subscription as s')
        .join('ServiceInstance as si', 's.service_instance_id', 'si.id')
        .join('ServiceDefinition as sd', 'si.service_definition_id', 'sd.id')
        .where((qb) =>
          qb.whereNull('s.start_date').orWhere('s.start_date', '<=', new Date())
        )
        .andWhere((qb) =>
          qb.whereNull('s.end_date').orWhere('s.end_date', '>', new Date())
        )
        .select('sd.identifier')
        .groupBy('sd.identifier')
        .count({ value: '*' })) as unknown as Array<GroupedRow<'identifier'>>;
      return rows.map((row) => ({
        value: toCount(row.value),
        attributes: { service: String(row.identifier) },
      }));
    },
  },
  {
    name: 'xtm_hub_service_instances_count',
    description: 'Total number of service instances',
    collect: () => single(database('ServiceInstance').count({ value: '*' })),
  },
  {
    name: 'xtm_hub_shared_resources_by_type',
    description:
      'Published, non-decommissioned library documents broken down by type (dashboards, CSV feeds, scenarios, ...)',
    collect: async () => {
      const rows = (await database('Document')
        .where({ status: DocumentStatus.Published, is_decommissioned: false })
        .select('type')
        .groupBy('type')
        .count({ value: '*' })) as unknown as Array<GroupedRow<'type'>>;
      return rows.map((row) => ({
        value: toCount(row.value),
        attributes: { type: String(row.type) },
      }));
    },
  },
];

const INSTANCE_ID_KEY = 'instance_id';
const INSTANCE_CREATION_KEY = 'instance_creation';

export interface InstanceIdentity {
  instanceId: string;
  instanceCreation: string;
}

/**
 * Load the durable anonymous instance identity seeded by the
 * `add_platform_metadata` migration. The identity survives restarts and
 * upgrades so the hub keeps reporting under the same id.
 */
export const loadInstanceIdentity = async (): Promise<InstanceIdentity> => {
  const rows = await database('PlatformMetadata')
    .whereIn('key', [INSTANCE_ID_KEY, INSTANCE_CREATION_KEY])
    .select('key', 'value');
  const byKey = Object.fromEntries(
    rows.map((row) => [row.key, String(row.value)])
  );
  return {
    instanceId: byKey[INSTANCE_ID_KEY] ?? 'unknown',
    instanceCreation: byKey[INSTANCE_CREATION_KEY] ?? '',
  };
};
