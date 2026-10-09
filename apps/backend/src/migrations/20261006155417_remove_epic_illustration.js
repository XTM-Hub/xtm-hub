/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const documentIds = await knex('Epic')
    .whereNotNull('document_id')
    .select('document_id')
    .then((rows) => rows.map((row) => row.document_id));

  // Dropping the column removes its foreign key to Document, which has to go
  // before the referenced Document rows can be deleted.
  await knex.schema.alterTable('Epic', (table) => {
    table.dropColumn('document_id');
  });

  if (documentIds.length > 0) {
    // Document_Children and Document_Metadata cascade (ON DELETE CASCADE).
    // This does not remove the underlying files from S3: migrations stay
    // PostgreSQL-only because they run on API startup.
    await knex('Document').whereIn('id', documentIds).del();
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // NOTE: this only restores the (empty) column and its foreign key so the
  // schema-level change is reversible. The epic illustration documents
  // deleted by `up()`, and their files, cannot be recreated here.
  await knex.schema.alterTable('Epic', (table) => {
    table.uuid('document_id').nullable().references('id').inTable('Document');
  });
}
