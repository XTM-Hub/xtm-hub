/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('LOCK TABLE "DeploymentRequestQuota" IN EXCLUSIVE MODE');

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.string('type').notNullable().defaultTo('trial');
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.string('platform_identifier').nullable().alter();
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.dropUnique(
      ['region', 'platform_identifier'],
      'deploymentrequestquota_region_platform_identifier_unique'
    );
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.unique(['region', 'platform_identifier'], {
      indexName: 'deployment_request_quota_region_platform_unique',
      predicate: knex.whereNotNull('platform_identifier'),
    });
    table.unique(['region'], {
      indexName: 'deployment_request_quota_region_bundle_unique',
      predicate: knex.whereRaw("type = 'bundle'"),
    });
  });

  const productQuotas = await knex('DeploymentRequestQuota')
    .whereNotNull('platform_identifier')
    .select('region', 'platform_identifier', 'capacity', 'availability');

  const bundleQuotaByRegion = new Map();
  for (const quota of productQuotas) {
    const bundleQuota = bundleQuotaByRegion.get(quota.region) ?? {
      capacity: null,
      occupied: 0,
    };

    bundleQuota.occupied += quota.capacity - quota.availability;
    if (quota.platform_identifier === 'opencti') {
      bundleQuota.capacity = quota.capacity;
    }

    bundleQuotaByRegion.set(quota.region, bundleQuota);
  }

  const bundleQuotas = [...bundleQuotaByRegion.entries()].map(
    ([region, { capacity, occupied }]) => {
      if (capacity === null) {
        throw new Error(
          `Cannot initialise bundle quota for region ${region}: no opencti quota found`
        );
      }

      return {
        id: knex.fn.uuid(),
        region,
        type: 'bundle',
        platform_identifier: null,
        capacity,
        availability: capacity - occupied,
      };
    }
  );

  if (bundleQuotas.length > 0) {
    await knex('DeploymentRequestQuota').insert(bundleQuotas);
  }

  await knex.raw(
    'ALTER TABLE "DeploymentRequestQuota" ALTER COLUMN type DROP DEFAULT'
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex('DeploymentRequestQuota').where('type', '=', 'bundle').del();

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.dropIndex(
      ['region', 'platform_identifier'],
      'deployment_request_quota_region_platform_unique'
    );
    table.dropIndex(
      ['region'],
      'deployment_request_quota_region_bundle_unique'
    );
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.string('platform_identifier').notNullable().alter();
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.unique(['region', 'platform_identifier']);
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.dropColumn('type');
  });
}
