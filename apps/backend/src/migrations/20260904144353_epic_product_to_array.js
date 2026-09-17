/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('ALTER TABLE "Epic" RENAME COLUMN product TO products');
  await knex.raw(
    'ALTER TABLE "Epic" ALTER COLUMN products TYPE text[] USING ARRAY[products]'
  );
  await knex.raw(
    'ALTER TABLE "Epic" ADD CONSTRAINT epic_products_not_empty CHECK (cardinality(products) > 0)'
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw('ALTER TABLE "Epic" DROP CONSTRAINT epic_products_not_empty');
  await knex.raw(
    'ALTER TABLE "Epic" ALTER COLUMN products TYPE text USING products[1]'
  );
  await knex.raw('ALTER TABLE "Epic" RENAME COLUMN products TO product');
}
