// Threat Pulse data generation: one row, bumped once a purge or a retention run
// has deleted contributions, so that a trending or digest snapshot computed
// from the deleted data is neither saved nor served.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (!(await knex.schema.hasTable('PulseDataGeneration'))) {
    await knex.schema.createTable('PulseDataGeneration', (table) => {
      table.smallint('id').primary();
      table.integer('generation').notNullable().defaultTo(0);
      table.check('?? = 1', ['id'], 'PulseDataGeneration_single_row');
    });
  }
  await knex('PulseDataGeneration')
    .insert({ id: 1, generation: 0 })
    .onConflict('id')
    .ignore();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('PulseDataGeneration');
}
