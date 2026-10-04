// Threat Pulse preview digest, computed once per day and TTL for the whole
// network: at-rest keys with their prevalence and trend only.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (!(await knex.schema.hasTable('PulseDigestSnapshot'))) {
    await knex.schema.createTable('PulseDigestSnapshot', (table) => {
      table.date('day').primary();
      table.timestamp('computed_at').notNullable().defaultTo(knex.fn.now());
      table.jsonb('items').notNullable();
    });
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('PulseDigestSnapshot');
}
