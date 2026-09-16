/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Speeds up lookups by metadata key. Indexes "key" only (not "value", which is
  // unbounded text and can exceed the btree row-size limit - see #3407).
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_document_metadata_key
    ON "Document_Metadata" ("key")
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
  await knex.raw(`DROP INDEX IF EXISTS idx_document_metadata_key`);
}
