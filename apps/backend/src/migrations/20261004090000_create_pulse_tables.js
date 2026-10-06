// Threat Pulse storage. Raw platform ids and raw observable values are never
// stored: platforms are identified by an HMAC pseudonym and objects by an
// at-rest key derived with a Hub-only secret.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (!(await knex.schema.hasTable('PulseSalt'))) {
    await knex.schema.createTable('PulseSalt', (table) => {
      table.date('day').primary();
      table.binary('salt').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('PulsePlatform'))) {
    await knex.schema.createTable('PulsePlatform', (table) => {
      table.increments('id').primary();
      table.binary('pseudonym').notNullable().unique();
      table.text('sector_bucket').notNullable();
      table.text('region_bucket').notNullable();
      table.date('first_contribution_day').notNullable();
      table.date('last_contribution_day').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_platform_last_contribution_day
    ON "PulsePlatform" ("last_contribution_day")
  `);

  if (!(await knex.schema.hasTable('PulseContribution'))) {
    await knex.schema.createTable('PulseContribution', (table) => {
      table
        .integer('pulse_platform_id')
        .notNullable()
        .references('id')
        .inTable('PulsePlatform')
        .onDelete('CASCADE');
      table.date('day').notNullable();
      table.binary('at_rest_key').notNullable();
      table.text('object_type').notNullable();
      table.text('event_kind').notNullable();
      table.text('sector_bucket').notNullable();
      table.text('region_bucket').notNullable();
      table.bigInteger('event_count').notNullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      table.primary([
        'pulse_platform_id',
        'day',
        'at_rest_key',
        'object_type',
        'event_kind',
        'sector_bucket',
        'region_bucket',
      ]);
      table.check(
        '?? > 0',
        ['event_count'],
        'pulse_contribution_event_count_positive'
      );
    });
  }
  // Lookups, trending and benchmark medians read the ledger by key over a day
  // range; the included columns make those reads index-only.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_contribution_key_day
    ON "PulseContribution" ("at_rest_key", "object_type", "day")
    INCLUDE ("pulse_platform_id", "sector_bucket", "region_bucket", "event_count")
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_contribution_day
    ON "PulseContribution" ("day")
  `);

  if (!(await knex.schema.hasTable('PulseKey'))) {
    await knex.schema.createTable('PulseKey', (table) => {
      table.binary('at_rest_key').notNullable();
      table.text('object_type').notNullable();
      table.integer('platform_count').notNullable();
      table.primary(['at_rest_key', 'object_type']);
      table.check(
        '?? >= 0',
        ['platform_count'],
        'pulse_key_platform_count_not_negative'
      );
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_key_platform_count
    ON "PulseKey" ("platform_count")
  `);

  if (!(await knex.schema.hasTable('PulseKeyContributor'))) {
    await knex.schema.createTable('PulseKeyContributor', (table) => {
      table.binary('at_rest_key').notNullable();
      table.text('object_type').notNullable();
      table
        .integer('pulse_platform_id')
        .notNullable()
        .references('id')
        .inTable('PulsePlatform')
        .onDelete('CASCADE');
      table.date('last_day').notNullable();
      table.primary(['at_rest_key', 'object_type', 'pulse_platform_id']);
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_key_contributor_platform
    ON "PulseKeyContributor" ("pulse_platform_id")
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_key_contributor_last_day
    ON "PulseKeyContributor" ("last_day")
  `);

  if (!(await knex.schema.hasTable('PulsePlatformDailyTotal'))) {
    await knex.schema.createTable('PulsePlatformDailyTotal', (table) => {
      table
        .integer('pulse_platform_id')
        .notNullable()
        .references('id')
        .inTable('PulsePlatform')
        .onDelete('CASCADE');
      table.date('day').notNullable();
      table.text('object_type').notNullable();
      table.text('event_kind').notNullable();
      table.text('sector_bucket').notNullable();
      table.text('region_bucket').notNullable();
      table.bigInteger('event_count').notNullable();
      table.primary([
        'pulse_platform_id',
        'day',
        'object_type',
        'event_kind',
        'sector_bucket',
        'region_bucket',
      ]);
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_platform_daily_total_day
    ON "PulsePlatformDailyTotal" ("day")
  `);

  if (!(await knex.schema.hasTable('PulseRateLimit'))) {
    await knex.schema.createTable('PulseRateLimit', (table) => {
      table.binary('pseudonym').notNullable();
      table.text('operation').notNullable();
      table.timestamp('bucket_start').notNullable();
      table.integer('request_count').notNullable();
      table.primary(['pseudonym', 'operation', 'bucket_start']);
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_rate_limit_bucket_start
    ON "PulseRateLimit" ("bucket_start")
  `);

  if (!(await knex.schema.hasTable('PulseTrendingSnapshot'))) {
    await knex.schema.createTable('PulseTrendingSnapshot', (table) => {
      table.date('day').notNullable();
      table.text('period').notNullable();
      table.text('sector_scope').notNullable();
      table.text('region_scope').notNullable();
      table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
      table.jsonb('items').notNullable();
      table.primary(['day', 'period', 'sector_scope', 'region_scope']);
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('PulseTrendingSnapshot');
  await knex.schema.dropTableIfExists('PulseRateLimit');
  await knex.schema.dropTableIfExists('PulsePlatformDailyTotal');
  await knex.schema.dropTableIfExists('PulseKeyContributor');
  await knex.schema.dropTableIfExists('PulseKey');
  await knex.schema.dropTableIfExists('PulseContribution');
  await knex.schema.dropTableIfExists('PulsePlatform');
  await knex.schema.dropTableIfExists('PulseSalt');
}
