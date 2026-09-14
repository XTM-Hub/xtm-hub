/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // The (key, value) btree index originally added by
  // 20260911123458_add_document_metadata_and_tags_indexes.js failed to build in
  // production: "value" is an unbounded text column (it stores things like
  // JSON.stringify()'d config_schema/additional_properties payloads), and a single
  // btree index entry can't exceed ~2704 bytes (see incident #3407). That migration
  // has since been fixed at the source to create a single-column "key" index instead,
  // so environments that run it fresh never create the broken index in the first
  // place. This migration remains to clean up environments (e.g. local/CI/staging)
  // where the original, unpatched migration already ran and left the broken composite
  // index behind. Every statement below is idempotent (IF EXISTS / IF NOT EXISTS), so
  // it is a harmless no-op anywhere the broken index was never created.
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
