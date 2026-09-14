/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Speeds up lookups by metadata key/value (e.g. finding documents by a given metadata entry).
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_document_metadata_key_value
    ON "Document_Metadata" ("key", "value")
  `);

  // GIN index to support the "@>" array containment operator used against Document.tags
  // (e.g. DocumentDomain.loadDistinctConnectorSlugs).
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_document_tags_gin
    ON "Document" USING gin ("tags")
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS idx_document_tags_gin`);
  await knex.raw(`DROP INDEX IF EXISTS idx_document_metadata_key_value`);
}
