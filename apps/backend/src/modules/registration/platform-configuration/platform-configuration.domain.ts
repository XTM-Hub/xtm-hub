import z from 'zod';
import { db, dbRaw } from '../../../../knexfile';
import {
  PlatformConfigurationStatus,
  PlatformContract,
  PlatformIdentifier,
} from '../../../__generated__/resolvers-types';
import { OrganizationId } from '../../../model/kanel/public/Organization';
import PlatformConfiguration, {
  PlatformConfigurationMutator,
} from '../../../model/kanel/public/PlatformConfiguration';
import ServiceDefinition from '../../../model/kanel/public/ServiceDefinition';
import { ServiceInstanceId } from '../../../model/kanel/public/ServiceInstance';
import { UserId } from '../../../model/kanel/public/User';
import { logApp } from '../../../utils/app-logger.util';
import { ErrorCode } from '../../../utils/error/error.code';
import { formatRawObject } from '../../../utils/query-raw.util';
import type { PlatformConfigurationInput } from '../registration.domain';
import { platformIdentifierMappedByServiceDefinitionIdentifier } from '../registration.mapping';

// A platform URL is stored and rendered as a link: only web schemes, never javascript: or file:.
export const PlatformUrlSchema = z.url({ protocol: /^https?$/ });

const PlatformConfigurationValidationSchema = z
  .object({
    registerer_id: z.uuid(),
    platform_id: z.uuid(),
    tenant_id: z.string().min(1).optional(),
    tenant_name: z.string().min(1).optional(),
    platform_url: PlatformUrlSchema,
    platform_title: z.string().min(1),
    platform_version: z.string().min(1).optional(),
    platform_contract: z.enum(PlatformContract),
    last_connectivity_check: z.date().optional(),
    token: z.uuid(),
  })
  .strict();

export type FullPlatformConfiguration = {
  platformConfiguration: PlatformConfiguration;
  serviceDefinition: ServiceDefinition;
  platformIdentifier: PlatformIdentifier;
};

type PlatformConfigurationWithDefinition = PlatformConfiguration & {
  service_definition: (Partial<ServiceDefinition> & { id?: string }) | null;
};

const resolvePlatformFromJoinedRow = (
  row: PlatformConfigurationWithDefinition
): FullPlatformConfiguration => {
  const { service_definition, ...platformConfiguration } = row;
  if (!service_definition?.id) {
    throw new Error(ErrorCode.ServiceDefinitionNotFound);
  }
  const serviceDefinition = service_definition as ServiceDefinition;
  const platformIdentifier =
    platformIdentifierMappedByServiceDefinitionIdentifier[
      serviceDefinition.identifier
    ];
  if (!platformIdentifier) {
    throw new Error(ErrorCode.InvalidPlatformIdentifier);
  }
  return {
    platformConfiguration,
    serviceDefinition,
    platformIdentifier,
  };
};

const buildJoinedConfigurationQuery = () =>
  db<PlatformConfiguration>('PlatformConfiguration')
    .leftJoin(
      'ServiceInstance',
      'ServiceInstance.id',
      '=',
      'PlatformConfiguration.service_instance_id'
    )
    .leftJoin(
      'ServiceDefinition',
      'ServiceDefinition.id',
      '=',
      'ServiceInstance.service_definition_id'
    )
    .select([
      'PlatformConfiguration.*',
      dbRaw(
        formatRawObject({
          columnName: 'ServiceDefinition',
          typename: 'ServiceDefinition',
          as: 'service_definition',
        })
      ),
    ]);

export const PlatformConfigurationDomain = {
  countConfigurationsByRegisterer: async (userId: UserId): Promise<number> => {
    const result = await db<PlatformConfiguration>('PlatformConfiguration')
      .where('registerer_id', '=', userId)
      .count<[{ count: string }]>('service_instance_id as count')
      .first();
    return Number(result?.count ?? 0);
  },

  countConfigurationsByOrganization: async (
    organizationId: OrganizationId
  ): Promise<number> => {
    const result = await db<PlatformConfiguration>('PlatformConfiguration')
      .join(
        'Subscription',
        'Subscription.service_instance_id',
        '=',
        'PlatformConfiguration.service_instance_id'
      )
      .where('Subscription.organization_id', '=', organizationId)
      .count<[{ count: string }]>(
        'PlatformConfiguration.service_instance_id as count'
      )
      .first();
    return Number(result?.count ?? 0);
  },

  isPlatformConfigurationValid: async (
    config: Record<string, unknown>
  ): Promise<boolean> => {
    const { success, error } =
      PlatformConfigurationValidationSchema.safeParse(config);
    if (!success) {
      logApp.error('Invalid platform configuration', { error });
    }
    return success;
  },

  loadConfigurationByPlatformAndToken: async ({
    platform_id,
    token,
    tenant_id,
    withoutTenantId,
  }: {
    platform_id: string;
    token: string;
    tenant_id?: string;
    withoutTenantId?: boolean;
  }): Promise<PlatformConfiguration | undefined> => {
    const qb = db<PlatformConfiguration>('PlatformConfiguration')
      .where('platform_id', '=', platform_id)
      .where('token', '=', token);

    if (tenant_id) {
      qb.where('tenant_id', '=', tenant_id);
    } else if (withoutTenantId) {
      qb.whereNull('tenant_id');
    }

    return qb.first();
  },

  loadConfigurationByPlatform: async (
    platformId: string,
    options?: { tenantId?: string | null } & PlatformConfigurationMutator
  ): Promise<PlatformConfiguration | undefined> => {
    const { tenantId, ...filter } = options ?? {};

    const qb = db<PlatformConfiguration>('PlatformConfiguration')
      .where('platform_id', '=', platformId)
      .where(filter)
      .first()
      .select('*');

    if (tenantId) {
      qb.where('tenant_id', '=', tenantId);
    }

    return qb;
  },

  updateConfiguration: async (
    serviceInstanceId: ServiceInstanceId,
    mutator: PlatformConfigurationMutator
  ) => {
    await db<PlatformConfiguration>('PlatformConfiguration')
      .update(mutator)
      .where('service_instance_id', '=', serviceInstanceId);
  },

  createConfiguration: async (
    serviceInstanceId: ServiceInstanceId,
    config: PlatformConfigurationInput
  ) => {
    await db<PlatformConfiguration>('PlatformConfiguration').insert({
      service_instance_id: serviceInstanceId,
      ...config,
    });
  },

  upsertConfiguration: async (
    serviceInstanceId: ServiceInstanceId,
    config: PlatformConfigurationInput
  ) => {
    await db<PlatformConfiguration>('PlatformConfiguration')
      .insert({
        service_instance_id: serviceInstanceId,
        ...config,
      })
      .onConflict('service_instance_id')
      .merge();
  },

  deleteConfigurationBy: async (conditions: PlatformConfigurationMutator) => {
    await db<PlatformConfiguration>('PlatformConfiguration')
      .where(conditions)
      .delete();
  },

  loadResolvedConfigurationByPlatform: async (
    platformId: string,
    options?: { tenantId?: string | null } & PlatformConfigurationMutator
  ): Promise<FullPlatformConfiguration | undefined> => {
    const { tenantId, ...filter } = options ?? {};

    const prefixedFilter = Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [
        `PlatformConfiguration.${key}`,
        value,
      ])
    );

    const qb = buildJoinedConfigurationQuery()
      .where('PlatformConfiguration.platform_id', '=', platformId)
      .where(prefixedFilter);

    if (tenantId) {
      qb.where('PlatformConfiguration.tenant_id', '=', tenantId);
    }

    const row = (await qb.first()) as
      PlatformConfigurationWithDefinition | undefined;
    return row ? resolvePlatformFromJoinedRow(row) : undefined;
  },

  loadResolvedConfigurationByPlatformAndToken: async ({
    platform_id,
    token,
    tenant_id,
    withoutTenantId,
  }: {
    platform_id: string;
    token: string;
    tenant_id?: string;
    withoutTenantId?: boolean;
  }): Promise<FullPlatformConfiguration | undefined> => {
    const qb = buildJoinedConfigurationQuery()
      .where('PlatformConfiguration.platform_id', '=', platform_id)
      .where('PlatformConfiguration.token', '=', token);

    if (tenant_id) {
      qb.where('PlatformConfiguration.tenant_id', '=', tenant_id);
    } else if (withoutTenantId) {
      qb.whereNull('PlatformConfiguration.tenant_id');
    }

    const row = (await qb.first()) as
      PlatformConfigurationWithDefinition | undefined;
    return row ? resolvePlatformFromJoinedRow(row) : undefined;
  },

  loadActiveConfigurationsByPlatformExcludingTenants: async (
    platformId: string,
    excludedTenantIds: string[],
    silentSince?: Date
  ): Promise<PlatformConfiguration[]> => {
    const qb = db<PlatformConfiguration[]>('PlatformConfiguration')
      .where('platform_id', '=', platformId)
      .where('status', '=', PlatformConfigurationStatus.Active)
      .whereNotNull('tenant_id')
      .select('*');

    if (excludedTenantIds.length > 0) {
      qb.whereNotIn('tenant_id', excludedTenantIds);
    }

    if (silentSince) {
      qb.where((silent) =>
        silent
          .whereNull('last_connectivity_check')
          .orWhere('last_connectivity_check', '<', silentSince)
      );
    }

    return qb;
  },
};
