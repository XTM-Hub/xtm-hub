/**
 * Adds `status` and `invitation_date` to the User table, for the trial-invite flow.
 *
 * `status` values: 'waiting' (created in hub, not yet on Auth0), 'invited' (created in hub
 * and Auth0, not yet verified), 'expired' (invite expired, no Auth0 account), or `null`
 * (fully onboarded: created in hub, in Auth0, and verified).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('User', (table) => {
    table.string('status').nullable().defaultTo(null);
    table.timestamp('invitation_date').nullable().defaultTo(null);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('User', (table) => {
    table.dropColumn('status');
    table.dropColumn('invitation_date');
  });
}
