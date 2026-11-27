/**
 * The GitHub release items created before the lookup moved to `key` hold a null key: they would not be found, so the
 * same version would get a second item, and the unique index ignores nulls. Their key is derived from the
 * product_version metadata, which is left untouched (the redirect reads it).
 * Overlapping calls could have left several items for one platform and version: only the oldest one that is not
 * deleted gets the key (the oldest one when all are deleted), the others keep a null key, which the unique index ignores, so the migration cannot fail on them. A version that already
 * has a keyed item is skipped, so a second run changes nothing.
 * A single UPDATE, not batches: the Hub holds one item per product and release.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw(`
    UPDATE "NewsFeedItem" AS item
      SET key = oldest.version
      FROM (
        SELECT DISTINCT ON (legacy.platform_identifier, metadata.value)
          legacy.id,
          metadata.value AS version
        FROM "NewsFeedItem" AS legacy
        JOIN "NewsFeedItemMetadata" AS metadata
          ON metadata.news_feed_item_id = legacy.id
        WHERE metadata.key = 'product_version'
          AND legacy.type = 'GITHUB_RELEASE'
          AND legacy.key IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "NewsFeedItem" AS keyed
            WHERE keyed.platform_identifier = legacy.platform_identifier
              AND keyed.type = legacy.type
              AND keyed.key = metadata.value
          )
        ORDER BY legacy.platform_identifier, metadata.value, legacy.is_deleted, legacy.creation_date, legacy.id
      ) AS oldest
      WHERE item.id = oldest.id;
  `);
}

/**
 * Before this migration the GitHub release items had no key.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`
    UPDATE "NewsFeedItem"
      SET key = NULL
      WHERE type = 'GITHUB_RELEASE';
  `);
}
