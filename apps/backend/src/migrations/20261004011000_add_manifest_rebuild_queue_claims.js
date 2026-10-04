/**
 * Records when and by which job a manifest rebuild request is claimed, so
 * that recovery ages a claim from its own start rather than from the
 * creation of the request, and so that a job only completes or releases its
 * own claim. Both columns are nullable: rows claimed before this migration
 * keep their creation time as fallback. Running it again changes nothing.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  const hasClaimedAt = await knex.schema.hasColumn(
    'ManifestRebuildQueue',
    'claimed_at'
  );
  const hasClaimId = await knex.schema.hasColumn(
    'ManifestRebuildQueue',
    'claim_id'
  );
  if (hasClaimedAt && hasClaimId) {
    return;
  }
  await knex.schema.alterTable('ManifestRebuildQueue', (table) => {
    if (!hasClaimedAt) {
      table.timestamp('claimed_at').nullable();
    }
    if (!hasClaimId) {
      table.uuid('claim_id').nullable();
    }
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('ManifestRebuildQueue', (table) => {
    table.dropColumn('claimed_at');
    table.dropColumn('claim_id');
  });
}
