import { afterEach, describe, expect, it } from 'vitest';
import { database } from '../../knexfile';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformIdentifier,
} from '../../src/__generated__/resolvers-types';
import * as addNewsFeedItemKey from '../../src/migrations/20261117140234_add_news_feed_item_key.js';
import NewsFeedItem from '../../src/model/kanel/public/NewsFeedItem';
import { TestHelper } from '../helper/test.helper';

const UNIQUE_VIOLATION = '23505';
const SLUG = 'a-blog-post';

// Knex runs each migration in a transaction: so does the test, a failing migration leaves the schema untouched
const migrate = (direction: 'up' | 'down') =>
  database.transaction((transaction) =>
    addNewsFeedItemKey[direction](transaction)
  );

const hasKeyColumn = () => database.schema.hasColumn('NewsFeedItem', 'key');

const createBlogpostWithSlug = async (
  platformIdentifier: PlatformIdentifier,
  slug: string,
  overrides: Partial<NewsFeedItem> = {}
) => {
  const item = await TestHelper.newsFeed.createItem({
    type: NewsFeedItemType.BlogPost,
    platform_identifier: platformIdentifier,
    title: `Blog post ${slug}`,
    ...overrides,
  });
  await TestHelper.newsFeed.createMetadata({
    news_feed_item_id: item.id,
    key: NewsFeedItemMetadataKey.BlogPostSlug,
    value: slug,
  });
  return item;
};

describe('migration add_news_feed_item_key', () => {
  // The other tests of the suite expect the schema of the last migration
  afterEach(async () => {
    if (!(await hasKeyColumn())) {
      await migrate('up');
    }
    await TestHelper.newsFeed.deleteItem();
  });

  describe('up', () => {
    it('should give the existing blog items their slug as key and leave the other items without key', async () => {
      // Given
      await migrate('down');
      const openCtiBlogpost = await createBlogpostWithSlug(
        PlatformIdentifier.Opencti,
        'opencti-blog-post'
      );
      const otherBlogpost = await createBlogpostWithSlug(
        PlatformIdentifier.Openaev,
        'other-blog-post'
      );
      const blogpostWithoutSlug = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'A blog post without slug',
      });
      const playbook = await createBlogpostWithSlug(
        PlatformIdentifier.Opencti,
        'playbook-slug',
        { type: NewsFeedItemType.ResourcePlaybook }
      );

      // When
      await migrate('up');

      // Then
      const keys = Object.fromEntries(
        (await TestHelper.newsFeed.loadItems()).map(({ id, key }) => [id, key])
      );
      expect(keys).toEqual({
        [openCtiBlogpost.id]: 'opencti-blog-post',
        [otherBlogpost.id]: 'other-blog-post',
        [blogpostWithoutSlug.id]: null,
        [playbook.id]: null,
      });
    });

    it('should keep the blog_post_slug metadata untouched', async () => {
      // Given
      await migrate('down');
      const blogpost = await createBlogpostWithSlug(
        PlatformIdentifier.Opencti,
        SLUG
      );

      // When
      await migrate('up');

      // Then
      expect(
        await TestHelper.newsFeed.loadMetadata({
          news_feed_item_id: blogpost.id,
        })
      ).toMatchObject([
        { key: NewsFeedItemMetadataKey.BlogPostSlug, value: SLUG },
      ]);
    });

    it('should accept the same key for another platform identifier and refuse it twice for the same one', async () => {
      // Given
      await createBlogpostWithSlug(PlatformIdentifier.Opencti, SLUG, {
        key: SLUG,
      });

      // When
      const sameSlugOnAnotherProduct = await createBlogpostWithSlug(
        PlatformIdentifier.Openaev,
        SLUG,
        { key: SLUG }
      );
      const sameSlugOnTheSameProduct = createBlogpostWithSlug(
        PlatformIdentifier.Opencti,
        SLUG,
        { key: SLUG }
      );

      // Then
      expect(sameSlugOnAnotherProduct).toMatchObject({
        platform_identifier: PlatformIdentifier.Openaev,
        key: SLUG,
      });
      await expect(sameSlugOnTheSameProduct).rejects.toMatchObject({
        code: UNIQUE_VIOLATION,
      });
    });

    it('should leave the items without key free to coexist', async () => {
      // Given
      await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'First',
      });

      // When
      const secondItem = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'Second',
      });

      // Then
      expect(secondItem).toMatchObject({ title: 'Second', key: null });
    });
  });

  describe('down', () => {
    it('should drop the key column and keep the items', async () => {
      // Given
      const item = await createBlogpostWithSlug(
        PlatformIdentifier.Opencti,
        SLUG,
        { key: SLUG }
      );

      // When
      await migrate('down');

      // Then
      expect(await hasKeyColumn()).toBe(false);
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: item.id })
      ).toMatchObject({
        id: item.id,
        title: `Blog post ${SLUG}`,
        platform_identifier: PlatformIdentifier.Opencti,
      });
    });

    it('should restore the unique index on the slug, whatever the platform identifier', async () => {
      // Given
      await migrate('down');
      await createBlogpostWithSlug(PlatformIdentifier.Opencti, SLUG);

      // When
      const sameSlugOnAnotherProduct = createBlogpostWithSlug(
        PlatformIdentifier.Openaev,
        SLUG
      );

      // Then
      await expect(sameSlugOnAnotherProduct).rejects.toMatchObject({
        code: UNIQUE_VIOLATION,
      });
    });

    it('should fail and change nothing while two products hold the same slug', async () => {
      // Given
      await createBlogpostWithSlug(PlatformIdentifier.Opencti, SLUG, {
        key: SLUG,
      });
      await createBlogpostWithSlug(PlatformIdentifier.Openaev, SLUG, {
        key: SLUG,
      });

      // When
      const down = migrate('down');

      // Then
      await expect(down).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
      expect(await hasKeyColumn()).toBe(true);
      expect(await TestHelper.newsFeed.loadItems({ key: SLUG })).toHaveLength(
        2
      );
    });
  });
});
