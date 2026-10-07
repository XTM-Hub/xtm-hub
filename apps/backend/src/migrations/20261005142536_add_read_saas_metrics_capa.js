const READ_SAAS_METRICS_UUID = '72dd8594-e8d2-4053-9cef-b51ffb497472';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex('CapabilityPortal')
    .insert({
      id: READ_SAAS_METRICS_UUID,
      name: 'READ_SAAS_METRICS',
    })
    .onConflict('name')
    .ignore();
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex('CapabilityPortal').where({ id: READ_SAAS_METRICS_UUID }).delete();
}
