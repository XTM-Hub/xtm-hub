/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    DELETE FROM "User_RolePortal" a
    USING "User_RolePortal" b
    WHERE a.id > b.id
      AND a.user_id = b.user_id
      AND a.role_portal_id = b.role_portal_id
  `);

  await knex.schema.alterTable('User_RolePortal', (table) => {
    table.unique(['user_id', 'role_portal_id'], {
      indexName: 'user_role_portal_user_id_role_portal_id_unique',
    });
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('User_RolePortal', (table) => {
    table.dropUnique(
      ['user_id', 'role_portal_id'],
      'user_role_portal_user_id_role_portal_id_unique'
    );
  });
}
