/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('User', (table) => {
    table
      .enum('has_replied_satisfaction', ['yes', 'no', 'closed', null])
      .defaultTo(null);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('User', (table) => {
    table.dropColumn('has_replied_satisfaction');
  });
}
