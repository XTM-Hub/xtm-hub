/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(
    'ALTER TABLE "Epic" ALTER COLUMN product TYPE text[] USING ARRAY[product]'
  );
  await knex.raw(
    'ALTER TABLE "Epic" ADD CONSTRAINT epic_product_not_empty CHECK (cardinality(product) > 0)'
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw('ALTER TABLE "Epic" DROP CONSTRAINT epic_product_not_empty');
  await knex.raw(
    'ALTER TABLE "Epic" ALTER COLUMN product TYPE text USING product[1]'
  );
}
