const INDEX_NAME = 'idx_news_feed_item_metadata_blog_post_slug_unique';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Partial index: only the blog_post_slug rows are constrained, the other
  // metadata keys keep sharing values freely.
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${INDEX_NAME}
      ON "NewsFeedItemMetadata" (value)
      WHERE key = 'blog_post_slug';
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS ${INDEX_NAME};`);
}
