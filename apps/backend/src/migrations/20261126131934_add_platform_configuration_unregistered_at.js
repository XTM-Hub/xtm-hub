const UNREGISTERED_AT_CHECK = 'platformconfiguration_unregistered_at_check';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('PlatformConfiguration', (table) => {
    // When an organization or a platform admin explicitly unregistered the platform: only then may another
    // organization connect it. Null for an active registration, and for one a connectivity check or the platform
    // itself marked inactive, which stays with its owner organization.
    table.timestamp('unregistered_at', { useTz: true }).nullable();
    table.check(
      "unregistered_at IS NULL OR status = 'inactive'",
      [],
      UNREGISTERED_AT_CHECK
    );
  });
  // Every existing row keeps a null unregistered_at, so an inactive registration stays with its owner organization.
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('PlatformConfiguration', (table) => {
    table.dropChecks([UNREGISTERED_AT_CHECK]);
    table.dropColumn('unregistered_at');
  });
}
