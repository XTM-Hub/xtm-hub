/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.alterTable('PlatformConfiguration', function (table) {
    table.enum('deactivation_reason', ['OMITTED_BY_PLATFORM']).nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.alterTable('PlatformConfiguration', function (table) {
    table.dropColumn('deactivation_reason');
  });
}
