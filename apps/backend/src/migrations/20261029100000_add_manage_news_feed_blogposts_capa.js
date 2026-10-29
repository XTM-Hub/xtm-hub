const MANAGE_NEWS_FEED_BLOGPOSTS_UUID = '46d50b3a-58c0-4e80-8cc7-0c1dfafe2430';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex('CapabilityPortal')
    .insert({
      id: MANAGE_NEWS_FEED_BLOGPOSTS_UUID,
      name: 'MANAGE_NEWS_FEED_BLOGPOSTS',
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
    .where({ id: MANAGE_NEWS_FEED_BLOGPOSTS_UUID })
    .delete();
}
