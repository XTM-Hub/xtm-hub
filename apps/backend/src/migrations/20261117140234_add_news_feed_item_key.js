const OLD_SLUG_INDEX_NAME = 'idx_news_feed_item_metadata_blog_post_slug_unique';
const KEY_INDEX_NAME = 'idx_news_feed_item_platform_identifier_type_key_unique';

/**
 * Adds the identity of a news feed item: a nullable `key`, unique with the platform identifier and the type, so that
 * the same natural identifier (the slug of a blog post) can exist once per product.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('NewsFeedItem', function (table) {
    table.text('key').nullable();
  });

  // The existing blog items keep the slug they were identified by: the blog_post_slug metadata is left untouched,
  // the key is derived from it. The other types of items keep a null key.
  await knex.raw(`
    UPDATE "NewsFeedItem" AS item
      SET key = metadata.value
      FROM "NewsFeedItemMetadata" AS metadata
      WHERE metadata.news_feed_item_id = item.id
        AND metadata.key = 'blog_post_slug'
        AND item.type = 'BLOG_POST';
  `);

  await knex.raw(`DROP INDEX IF EXISTS ${OLD_SLUG_INDEX_NAME};`);

  // Postgres never treats two nulls as equal in a unique index: the items without a key do not collide.
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${KEY_INDEX_NAME}
      ON "NewsFeedItem" (platform_identifier, type, key);
  `);
}

/**
 * The slug-only index cannot be restored while two items hold the same slug for different products: the
 * creation of the index then fails, and the items of the other products must be removed first.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS ${KEY_INDEX_NAME};`);

  await knex.schema.alterTable('NewsFeedItem', function (table) {
    table.dropColumn('key');
  });

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS ${OLD_SLUG_INDEX_NAME}
      ON "NewsFeedItemMetadata" (value)
      WHERE key = 'blog_post_slug';
  `);
}
