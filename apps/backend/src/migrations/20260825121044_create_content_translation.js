/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable('ContentTranslation', (table) => {
    table.text('key').notNullable();
    table.enu('locale', ['en', 'fr', 'ja']).notNullable();
    table.text('value').notNullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table
      .uuid('updater_id')
      .nullable()
      .references('id')
      .inTable('User')
      .onDelete('SET NULL');
    table.primary(['key', 'locale']);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('ContentTranslation');
}
