// Threat Pulse batches already recorded, per platform pseudonym: a pushPulse
// retried after its response was lost is answered with its first result and
// counted once. A batch can only use the salt of the current or the previous
// UTC day, so a row is kept as long as the salt of its day and then deleted.
// The rows outlive a purge of the platform, with their count set to 0, so that
// a batch accepted before the purge and retried after it records nothing.

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  if (!(await knex.schema.hasTable('PulseBatch'))) {
    await knex.schema.createTable('PulseBatch', (table) => {
      table.binary('pseudonym').notNullable();
      table.uuid('batch_id').notNullable();
      table.date('day').notNullable();
      table.integer('accepted').notNullable();
      table.primary(['pseudonym', 'batch_id']);
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_pulse_batch_day
    ON "PulseBatch" ("day")
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('PulseBatch');
}
