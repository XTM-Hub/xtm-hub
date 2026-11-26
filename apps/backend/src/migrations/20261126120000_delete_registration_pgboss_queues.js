/**
 * No worker consumes the pg-boss queues of the commercial model of a registration since SaaS Manager pushes its
 * instances to the Hub: drop them with their jobs. The commercial-model queue goes first, its dead_letter references
 * the dead-letter queue. The guards cover a database pg-boss has never started on, and one that never had the queues.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    DO $$
    DECLARE
      queue_name text;
    BEGIN
      IF to_regprocedure('pgboss.delete_queue(text)') IS NULL THEN
        RETURN;
      END IF;
      FOREACH queue_name IN ARRAY ARRAY['registration.commercial-model', 'registration.deadletter'] LOOP
        IF EXISTS (SELECT 1 FROM pgboss.queue WHERE name = queue_name) THEN
          PERFORM pgboss.delete_queue(queue_name);
        END IF;
      END LOOP;
    END $$;
  `);
}

/**
 * Irreversible: the jobs are gone. Code that works the queues again creates them on start.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down() {}
