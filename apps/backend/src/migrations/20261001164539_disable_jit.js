// Disable JIT compilation for this database (#3596). Our workload is OLTP and JIT
// compile time dwarfs execution time. Local benchmark on PostgreSQL 17.2:
// documentFacets went from 360 ms to 1 070 ms at 8k integrations and from 870 ms
// to 10.2 s at 20k, the integrations CSV export from 762 ms to 4.6 s at 20k, and
// no measured query gained more than 7%.
//
// The database name differs per environment (`cloud-portal` needs quoting), hence
// `current_database()` instead of a hardcoded name.
//
// A database-level setting only applies to new sessions: restart the API after
// deploying, or the pool connections opened before this migration keep JIT on.
//
// It is stored in pg_db_role_setting, which a logical restore (pg_dump without
// --create) does not carry over while this migration stays marked as applied.
// Setting `jit: "off"` in the CloudNativePG Cluster `spec.postgresql.parameters`
// makes it survive restores.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      EXECUTE format('ALTER DATABASE %I SET jit = off', current_database());
    END
    $$
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`
    DO $$
    BEGIN
      EXECUTE format('ALTER DATABASE %I RESET jit', current_database());
    END
    $$
  `);
}
