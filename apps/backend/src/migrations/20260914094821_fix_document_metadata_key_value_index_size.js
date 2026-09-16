/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Cleanup for environments that already ran the old, unpatched
  // 20260911123458 migration and are left with the broken (key, value)
  // index (see #3407). 20260911123458 is now fixed at the source, so this
  // is a harmless no-op anywhere that index was never created.
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
