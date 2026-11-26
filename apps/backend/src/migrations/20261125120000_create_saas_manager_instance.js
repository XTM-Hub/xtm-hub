/**
 * The instances SaaS Manager pushes to the Hub (upsertSaasManagerInstances): its list row (data) and metric windows
 * (metrics) as it sends them, next to the columns the list filters, searches and orders on.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('SaasManagerInstance', (table) => {
    table.uuid('id').primary();
    table.jsonb('data').notNullable();
    table.jsonb('metrics');
    table.text('customer_name').notNullable();
    table.text('customer_techname');
    table.text('plan_name').notNullable();
    table.text('status_family');
    table.text('upgrade_group');
    table.text('product');
    table.text('hostname');
    table.date('end_date');
    table.timestamp('generated_at', { useTz: true }).notNullable();
    table.index(['status_family']);
    table.index(['generated_at']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('SaasManagerInstance');
}
