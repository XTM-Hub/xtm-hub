/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Speeds up lookups by metadata key (e.g. finding documents by a given metadata entry).
  // NOTE: this originally created a composite (key, value) index, but "value" is an
  // unbounded text column that can hold arbitrarily large JSON payloads (e.g.
  // config_schema/additional_properties), and a single btree index entry can't exceed
  // ~2704 bytes. That made CREATE INDEX fail wherever such a row already existed
  // (see incident #3407), which rolled back this whole migration - including the GIN
  // index below - and left it permanently pending/retried on every startup. Indexing
  // "key" alone (bounded, varchar) avoids that failure mode entirely while still letting
  // lookups narrow down to the rows for a given metadata key before filtering by value.
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
