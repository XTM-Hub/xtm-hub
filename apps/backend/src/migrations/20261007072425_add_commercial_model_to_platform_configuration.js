/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.alterTable('PlatformConfiguration', function (table) {
    table
      .enum('commercial_model', ['SAAS', 'OTHER'])
      .notNullable()
      .defaultTo('OTHER');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.alterTable('PlatformConfiguration', function (table) {
    table.dropColumn('commercial_model');
  });
}
