const READ_ORGANIZATION_MEMBERS_UUID = '4ef3679a-a81e-4068-b3b5-39fee027c972';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex('CapabilityPortal')
    .insert({
      id: READ_ORGANIZATION_MEMBERS_UUID,
      name: 'READ_ORGANIZATION_MEMBERS',
    })
    .onConflict('name')
    .ignore();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex('CapabilityPortal')
    .where({ id: READ_ORGANIZATION_MEMBERS_UUID })
    .delete();
}
