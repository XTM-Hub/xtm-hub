const PRODUCT_PLATFORM_IDENTIFIERS = ['opencti', 'openaev'];
const QUOTA_HOLDING_HUB_STATUSES = ['active', 'pending', 'provisioning'];

const countRootRequestsByRegion = async (knex) => {
  const rows = await knex('DeploymentRequest')
    .whereNull('parent_id')
    .whereIn('hub_status', QUOTA_HOLDING_HUB_STATUSES)
    .groupBy('region')
    .select('region')
    .count('id as count');

  return new Map(rows.map((row) => [row.region, Number(row.count)]));
};

const countProductRequestsByRegion = async (knex, platformIdentifier) => {
  const rows = await knex('DeploymentRequest')
    .where('platform_identifier', '=', platformIdentifier)
    .whereIn('hub_status', QUOTA_HOLDING_HUB_STATUSES)
    .groupBy('region')
    .select('region')
    .count('id as count');

  return new Map(rows.map((row) => [row.region, Number(row.count)]));
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('LOCK TABLE "DeploymentRequestQuota" IN EXCLUSIVE MODE');

  await knex('DeploymentRequestQuota').where('type', '=', 'trial').del();

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
    table.dropColumn('platform_identifier');
    table.dropColumn('type');
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.unique(['region']);
  });

  const heldPlacesByRegion = await countRootRequestsByRegion(knex);
  const quotas = await knex('DeploymentRequestQuota').select(
    'id',
    'region',
    'capacity'
  );

  for (const quota of quotas) {
    await knex('DeploymentRequestQuota')
      .update({
        availability:
          quota.capacity - (heldPlacesByRegion.get(quota.region) ?? 0),
      })
      .where({ id: quota.id });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw('LOCK TABLE "DeploymentRequestQuota" IN EXCLUSIVE MODE');

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.dropUnique(['region']);
  });

  await knex.schema.alterTable('DeploymentRequestQuota', (table) => {
    table.string('type').notNullable().defaultTo('bundle');
    table.string('platform_identifier').nullable();
  });

  await knex.raw(
    'ALTER TABLE "DeploymentRequestQuota" ALTER COLUMN type DROP DEFAULT'
  );

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

  const bundleQuotas = await knex('DeploymentRequestQuota').select(
    'region',
    'capacity'
  );

  const productQuotas = [];
  for (const platformIdentifier of PRODUCT_PLATFORM_IDENTIFIERS) {
    const heldPlacesByRegion = await countProductRequestsByRegion(
      knex,
      platformIdentifier
    );

    for (const quota of bundleQuotas) {
      productQuotas.push({
        id: knex.fn.uuid(),
        region: quota.region,
        type: 'trial',
        platform_identifier: platformIdentifier,
        capacity: quota.capacity,
        availability:
          quota.capacity - (heldPlacesByRegion.get(quota.region) ?? 0),
      });
    }
  }

  if (productQuotas.length > 0) {
    await knex('DeploymentRequestQuota').insert(productQuotas);
  }
}
