export const config = { transaction: false };

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_name_trgm
    ON "Document" USING gin ("name" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_file_name_trgm
    ON "Document" USING gin ("file_name" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_description_trgm
    ON "Document" USING gin ("description" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_short_description_trgm
    ON "Document" USING gin ("short_description" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_metadata_value_trgm
    ON "Document_Metadata" USING gin ("value" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_use_case_name_trgm
    ON "UseCase" USING gin ("name" gin_trgm_ops)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_solution_category_name_trgm
    ON "SolutionCategory" USING gin ("name" gin_trgm_ops)
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS idx_solution_category_name_trgm`
  );
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS idx_use_case_name_trgm`);
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS idx_document_metadata_value_trgm`
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS idx_document_short_description_trgm`
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS idx_document_description_trgm`
  );
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS idx_document_file_name_trgm`
  );
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS idx_document_name_trgm`);

  await knex.raw(`DROP EXTENSION IF EXISTS pg_trgm`);
}
