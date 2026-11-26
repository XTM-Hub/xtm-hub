const SYSTEM_USER_UUID = 'f0587688-ef35-466a-9f71-a8807ba460b8';

const USER_REFERENCE_COLUMNS = [
  { table: 'Document', column: 'uploader_id' },
  { table: 'Document', column: 'remover_id' },
  { table: 'Document', column: 'updater_id' },
  { table: 'Epic', column: 'uploader_id' },
  { table: 'Epic', column: 'updater_id' },
  { table: 'PlatformConfiguration', column: 'registerer_id' },
  { table: 'DeploymentRequest', column: 'cancellation_user_id' },
];

const indexName = ({ table, column }) => `idx_${table.toLowerCase()}_${column}`;

const danglingReferences = (knex, { table, column }) =>
  knex(table)
    .whereNotNull(column)
    .whereNotIn(column, knex('User').select('id'));

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  for (const reference of USER_REFERENCE_COLUMNS) {
    await danglingReferences(knex, reference).update({
      [reference.column]: SYSTEM_USER_UUID,
    });
  }

  for (const reference of USER_REFERENCE_COLUMNS) {
    await knex.schema.alterTable(reference.table, (table) => {
      table.foreign(reference.column).references('id').inTable('User');
      table.index(reference.column, indexName(reference));
    });
  }

  await knex.schema.alterTable('DeploymentRequest', (table) => {
    table.dropForeign(['user_requester_id']);
    table.foreign('user_requester_id').references('id').inTable('User');
  });

  await knex('OneClickDeployment')
    .whereNotNull('user_id')
    .whereNotIn('user_id', knex('User').select('id'))
    .update({ user_id: null });

  await knex.schema.alterTable('OneClickDeployment', (table) => {
    table
      .foreign('user_id')
      .references('id')
      .inTable('User')
      .onDelete('SET NULL');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable('OneClickDeployment', (table) => {
    table.dropForeign(['user_id']);
  });

  await knex.schema.alterTable('DeploymentRequest', (table) => {
    table.dropForeign(['user_requester_id']);
    table
      .foreign('user_requester_id')
      .references('id')
      .inTable('User')
      .onDelete('CASCADE');
  });

  for (const reference of USER_REFERENCE_COLUMNS) {
    await knex.schema.alterTable(reference.table, (table) => {
      table.dropForeign([reference.column]);
      table.dropIndex(reference.column, indexName(reference));
    });
  }
}
