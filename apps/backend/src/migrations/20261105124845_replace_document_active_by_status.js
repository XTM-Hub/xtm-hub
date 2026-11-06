/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('Document', function (table) {
    table
      .enum('status', ['draft', 'in_validation', 'published'])
      .notNullable()
      .defaultTo('published');
  });

  await knex('Document').where('active', false).update({ status: 'draft' });

  await knex.schema.alterTable('Document', function (table) {
    table.dropColumn('active');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('Document', function (table) {
    table.boolean('active').notNullable().defaultTo(true);
  });

  await knex('Document').whereNot('status', 'published').update({
    active: false,
  });

  await knex.schema.alterTable('Document', function (table) {
    table.dropColumn('status');
  });
}
