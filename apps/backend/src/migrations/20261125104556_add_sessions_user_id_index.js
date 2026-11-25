// CREATE INDEX CONCURRENTLY cannot run inside a transaction
export const config = { transaction: false };

/**
 * Looks up the sessions of a user (refresh and revocation of its sessions)
 * without scanning every session.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id
    ON sessions ((sess->'user'->>'id'))
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_user_id`);
}
