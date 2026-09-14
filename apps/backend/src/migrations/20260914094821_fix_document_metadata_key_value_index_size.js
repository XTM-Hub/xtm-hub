/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // The (key, value) btree index added in
  // 20260911123458_add_document_metadata_and_tags_indexes.js fails to build
  // in production: "value" is an unbounded text column (it stores things
  // like JSON.stringify()'d config_schema/additional_properties payloads),
  // and a single btree index entry can't exceed ~2704 bytes. Any row whose
  // key+value pair is larger than that makes CREATE INDEX fail there, and
  // would also make future INSERT/UPDATE of such a row fail wherever the
  // index did get created.
  // Replace it with a single-column index on "key" only, which is bounded
  // (varchar) and therefore always safe to index, while still letting
  // lookups narrow down to the (typically small) set of rows for a given
  // metadata key before filtering by value.
  await knex.raw(`DROP INDEX IF EXISTS idx_document_metadata_key_value`);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_document_metadata_key
    ON "Document_Metadata" ("key")
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Intentionally does not recreate idx_document_metadata_key_value: that
  // index is what caused the production incident this migration fixes, so
  // reinstating it here would just reintroduce the bug.
  await knex.raw(`DROP INDEX IF EXISTS idx_document_metadata_key`);
}
