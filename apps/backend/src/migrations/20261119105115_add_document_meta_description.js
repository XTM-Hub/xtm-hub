/**
 * Adds the SEO meta description of a shareable resource. Nullable: the existing documents have none, and the
 * application only requires it on creation. 160 characters is the length search engines display.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('Document', function (table) {
    table.string('meta_description', 160).nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('Document', function (table) {
    table.dropColumn('meta_description');
  });
}
