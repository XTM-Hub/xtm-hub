import { createCipheriv, createHmac } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { db, dbRaw } from '../../knexfile';
import {
  PlatformConfigurationStatus,
  PulseObjectType,
} from '../../src/__generated__/resolvers-types';
import PlatformConfigurationModel from '../../src/model/kanel/public/PlatformConfiguration';
import { ServiceDefinitionId } from '../../src/model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../src/model/kanel/public/ServiceInstance';
import Subscription, {
  SubscriptionId,
} from '../../src/model/kanel/public/Subscription';
import { SERVICES, TEST_ORGANIZATIONS } from '../tests.const';
import { mockPlatformConfig } from './test-platform-configuration.helper';

// Client side of the wire contract, as implemented by OpenCTI: the Hub only
// ever receives the transport hash.
const STABLE_KEY_HMAC_KEY = 'opencti-pulse-v1';

export const PULSE_TABLES = [
  'PulseTrendingSnapshot',
  'PulseRateLimit',
  'PulsePlatformDailyTotal',
  'PulseKeyContributor',
  'PulseKey',
  'PulseDailyAggregate',
  'PulseContribution',
  'PulsePlatform',
  'PulseSalt',
] as const;

export type PulseTable = (typeof PULSE_TABLES)[number];

export interface TestPulsePlatform {
  platformId: string;
  token: string;
  serviceInstanceId: ServiceInstanceId;
}

const createdServiceInstanceIds: ServiceInstanceId[] = [];

export const TestPulseHelper = {
  pulse: {
    stableKey: (objectType: PulseObjectType, canonicalValue: string): Buffer =>
      createHmac('sha256', STABLE_KEY_HMAC_KEY)
        .update(`${objectType}\n${canonicalValue}`)
        .digest()
        .subarray(0, 16),

    transportHash: (stableKey: Buffer, saltHex: string): string => {
      const cipher = createCipheriv(
        'aes-128-ecb',
        Buffer.from(saltHex, 'hex'),
        null
      );
      cipher.setAutoPadding(false);
      return Buffer.concat([cipher.update(stableKey), cipher.final()]).toString(
        'hex'
      );
    },

    hashValue: (
      objectType: PulseObjectType,
      canonicalValue: string,
      saltHex: string
    ): string =>
      TestPulseHelper.pulse.transportHash(
        TestPulseHelper.pulse.stableKey(objectType, canonicalValue),
        saltHex
      ),

    registerPlatform: async ({
      serviceDefinitionId = SERVICES.DEFINITIONS.OPENCTI_REGISTRATION.ID,
      status = PlatformConfigurationStatus.Active,
    }: {
      serviceDefinitionId?: ServiceDefinitionId;
      status?: PlatformConfigurationStatus;
    } = {}): Promise<TestPulsePlatform> => {
      const serviceInstanceId = uuidv4() as ServiceInstanceId;
      await db('ServiceInstance').insert({
        id: serviceInstanceId,
        name: 'Threat Pulse test platform',
        service_definition_id: serviceDefinitionId,
        tags: [],
        public: false,
      });
      createdServiceInstanceIds.push(serviceInstanceId);
      const [configuration] = await db<PlatformConfigurationModel>(
        'PlatformConfiguration'
      )
        .insert({
          ...mockPlatformConfig,
          service_instance_id: serviceInstanceId,
          platform_id: uuidv4(),
          token: uuidv4(),
          status,
          tenant_id: null,
          tenant_name: null,
        })
        .returning('*');
      await db<Subscription>('Subscription').insert({
        id: uuidv4() as SubscriptionId,
        service_instance_id: serviceInstanceId,
        organization_id: TEST_ORGANIZATIONS.SECOND_ORGANIZATION.ID,
      });
      if (!configuration) {
        throw new Error('Test platform configuration was not created');
      }
      return {
        platformId: configuration.platform_id,
        token: configuration.token,
        serviceInstanceId,
      };
    },

    cleanPlatforms: async (): Promise<void> => {
      if (createdServiceInstanceIds.length === 0) {
        return;
      }
      await db('Subscription')
        .whereIn('service_instance_id', createdServiceInstanceIds)
        .del();
      await db('PlatformConfiguration')
        .whereIn('service_instance_id', createdServiceInstanceIds)
        .del();
      await db('ServiceInstance')
        .whereIn('id', createdServiceInstanceIds)
        .del();
      createdServiceInstanceIds.length = 0;
    },

    // Salts are kept: a day's salt is immutable and cached by the service.
    cleanTables: async (): Promise<void> => {
      for (const table of PULSE_TABLES) {
        if (table !== 'PulseSalt') {
          await db(table).del();
        }
      }
    },

    countRows: async (table: PulseTable): Promise<number> => {
      const [row] = await db(table).count<[{ count: string }]>('* as count');
      return Number(row?.count ?? 0);
    },

    loadContributionDays: async (): Promise<string[]> => {
      const rows = await db('PulseContribution')
        .distinct(dbRaw('day::text AS day'))
        .orderBy('day');
      return rows.map((row: { day: string }) => row.day);
    },

    loadDailyAggregates: async (): Promise<
      {
        day: string;
        platform_count: number;
        created_count: string;
        sighted_count: string;
      }[]
    > => {
      const rows = await db('PulseDailyAggregate')
        .select(
          dbRaw('day::text AS day'),
          'platform_count',
          'created_count',
          'sighted_count'
        )
        .orderBy('day');
      return rows.map(
        (row: {
          day: string;
          platform_count: number;
          created_count: string;
          sighted_count: string;
        }) => ({
          day: row.day,
          platform_count: row.platform_count,
          created_count: row.created_count,
          sighted_count: row.sighted_count,
        })
      );
    },

    loadKeyPlatformCounts: async (): Promise<number[]> => {
      const rows = await db('PulseKey')
        .select('platform_count')
        .orderBy('platform_count');
      return rows.map((row: { platform_count: number }) => row.platform_count);
    },

    loadSaltDays: async (): Promise<string[]> => {
      const rows = await db('PulseSalt')
        .select(dbRaw('day::text AS day'))
        .orderBy('day');
      return rows.map((row: { day: string }) => row.day);
    },

    // Concatenated textual dump of every Pulse table, used to prove no raw
    // identifier or transport hash is ever stored.
    dumpTables: async (): Promise<string> => {
      const dumps: string[] = [];
      for (const table of PULSE_TABLES) {
        const rows = await db(table).select(
          dbRaw('row_to_json(??)::text AS row', [table])
        );
        dumps.push(...rows.map((row: { row: string }) => row.row));
      }
      return dumps.join('\n');
    },

    insertSalt: async (day: string, saltHex: string): Promise<void> => {
      await db('PulseSalt').insert({
        day: dbRaw('?::date', [day]),
        salt: Buffer.from(saltHex, 'hex'),
      });
    },
  },
};
