const CONSTRAINT_NAME = 'user_organization_user_id_organization_id_unique';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Block concurrent writers until commit, so no duplicate can be inserted
  // between the cleanup below and the constraint creation.
  await knex.raw('LOCK TABLE "User_Organization" IN SHARE ROW EXCLUSIVE MODE');

  // For each (user_id, organization_id) pair, keep the oldest row and
  // reattach the capabilities of the other rows to it.
  await knex.raw(`
    WITH ranked AS (
      SELECT
        id,
        FIRST_VALUE(id) OVER (
          PARTITION BY user_id, organization_id ORDER BY id
        ) AS kept_id
      FROM "User_Organization"
      WHERE user_id IS NOT NULL AND organization_id IS NOT NULL
    )
    UPDATE "UserOrganization_Capability" capability
    SET user_organization_id = ranked.kept_id
    FROM ranked
    WHERE capability.user_organization_id = ranked.id
      AND ranked.id <> ranked.kept_id
  `);

  // Merging can leave the same capability twice on the kept row.
  await knex.raw(`
    DELETE FROM "UserOrganization_Capability" capability
    USING "UserOrganization_Capability" other
    WHERE capability.user_organization_id = other.user_organization_id
      AND capability.name = other.name
      AND capability.id > other.id
  `);

  await knex.raw(`
    DELETE FROM "User_Organization" duplicate
    USING "User_Organization" kept
    WHERE duplicate.user_id = kept.user_id
      AND duplicate.organization_id = kept.organization_id
      AND duplicate.id > kept.id
  `);

  await knex.schema.alterTable('User_Organization', (table) => {
    table.unique(['user_id', 'organization_id'], {
      indexName: CONSTRAINT_NAME,
    });
  });
}

/**
 * The duplicate rows removed by `up` are not restored.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('User_Organization', (table) => {
    table.dropUnique(['user_id', 'organization_id'], CONSTRAINT_NAME);
  });
}
