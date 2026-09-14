/**
 * Pre-flight probes (run on a prod-sized copy BEFORE applying this
 * migration — do not skip):
 *
 *   SELECT count(*) AS rows, max(octet_length(value)) AS max_value_bytes
 *   FROM "Document_Metadata";
 *
 *   - `max_value_bytes` must stay under ~2704 bytes (the btree index row
 *     cap) or `CREATE INDEX` fails outright on the oversized row. If it
 *     does not, STOP — do not ship this migration as-is; fall back to a
 *     partial index (e.g. `WHERE key IN (<facet keys>)`, verified with
 *     `EXPLAIN`, not assumed) or another approach.
 *   - `rows` decides whether a plain (blocking) `CREATE INDEX` is safe.
 *     Migrations run synchronously at API startup and block it, so a
 *     plain `CREATE INDEX` takes a `SHARE` lock for its build duration,
 *     blocking writes to `Document_Metadata` (written only on document
 *     create/update) until it completes. Under ~1M rows this is seconds;
 *     use the plain migration below. Materially larger needs
 *     `CREATE INDEX CONCURRENTLY` (`config = { transaction: false }`)
 *     instead — deliberately NOT used here: a failed concurrent build
 *     leaves an INVALID index behind while the migration row is already
 *     recorded, so every subsequent pod boot silently skips retrying it.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('Document_Metadata', (table) => {
    table.index(['key', 'value'], 'idx_document_metadata_key_value');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('Document_Metadata', (table) => {
    table.dropIndex(['key', 'value'], 'idx_document_metadata_key_value');
  });
}
