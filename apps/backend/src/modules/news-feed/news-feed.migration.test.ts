import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
} from '../../__generated__/resolvers-types';

const UNIQUE_VIOLATION_CODE = '23505';
const SLUG = 'threat-report-2026';

describe('blog_post_slug unique index migration', () => {
  const createBlogPostWithSlug = async (slug: string) => {
    const item = await TestHelper.newsFeed.createItem({
      type: NewsFeedItemType.BlogPost,
      title: `Blog post ${slug}`,
    });
    await TestHelper.newsFeed.createMetadata({
      news_feed_item_id: item.id,
      key: NewsFeedItemMetadataKey.BlogPostSlug,
      value: slug,
    });
    return item;
  };

  beforeEach(async () => {
    await TestHelper.newsFeed.deleteItem();
  });

  afterEach(async () => {
    await TestHelper.newsFeed.deleteItem();
    // Leave the index in the state the migrations gave it
    await TestHelper.blogPostSlugIndexMigration.up();
  });

  it('should have created the index once the migrations ran', async () => {
    // When
    const exists = await TestHelper.blogPostSlugIndexMigration.indexExists();

    // Then
    expect(exists).toBe(true);
  });

  it('should refuse a second item with the same blog_post_slug', async () => {
    // Given
    await createBlogPostWithSlug(SLUG);
    const second = await TestHelper.newsFeed.createItem({
      type: NewsFeedItemType.BlogPost,
      title: 'Second blog post',
    });

    // When
    const insertion = TestHelper.newsFeed.createMetadata({
      news_feed_item_id: second.id,
      key: NewsFeedItemMetadataKey.BlogPostSlug,
      value: SLUG,
    });

    // Then
    await expect(insertion).rejects.toMatchObject({
      code: UNIQUE_VIOLATION_CODE,
    });
  });

  it('should accept items with different blog_post_slug values', async () => {
    // Given
    await createBlogPostWithSlug(SLUG);

    // When
    const second = await createBlogPostWithSlug('another-report-2026');

    // Then
    const metadata = await TestHelper.newsFeed.loadFirstMetadata({
      news_feed_item_id: second.id,
    });
    expect(metadata).toMatchObject({
      key: NewsFeedItemMetadataKey.BlogPostSlug,
      value: 'another-report-2026',
    });
  });

  it.each([
    NewsFeedItemMetadataKey.UrlPath,
    NewsFeedItemMetadataKey.Description,
    NewsFeedItemMetadataKey.ImageUrl,
    NewsFeedItemMetadataKey.ImageAlt,
    NewsFeedItemMetadataKey.AuthorNames,
    NewsFeedItemMetadataKey.ReadMinutes,
  ])('should not constrain the %s metadata key', async (key) => {
    // Given
    const first = await TestHelper.newsFeed.createItem({
      type: NewsFeedItemType.BlogPost,
      title: 'First blog post',
    });
    const second = await TestHelper.newsFeed.createItem({
      type: NewsFeedItemType.BlogPost,
      title: 'Second blog post',
    });
    await TestHelper.newsFeed.createMetadata({
      news_feed_item_id: first.id,
      key,
      value: 'shared value',
    });

    // When
    const metadata = await TestHelper.newsFeed.createMetadata({
      news_feed_item_id: second.id,
      key,
      value: 'shared value',
    });

    // Then
    expect(metadata).toMatchObject({
      news_feed_item_id: second.id,
      key,
      value: 'shared value',
    });
  });

  describe('down', () => {
    it('should drop the index so that two items can share a slug again', async () => {
      // Given
      await createBlogPostWithSlug(SLUG);

      // When
      await TestHelper.blogPostSlugIndexMigration.down();

      // Then
      expect(await TestHelper.blogPostSlugIndexMigration.indexExists()).toBe(
        false
      );
      const second = await createBlogPostWithSlug(SLUG);
      const metadata = await TestHelper.newsFeed.loadFirstMetadata({
        news_feed_item_id: second.id,
      });
      expect(metadata).toMatchObject({
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: SLUG,
      });
    });

    it('should not fail when the index is already dropped', async () => {
      // Given
      await TestHelper.blogPostSlugIndexMigration.down();

      // When
      const rollback = TestHelper.blogPostSlugIndexMigration.down();

      // Then
      await expect(rollback).resolves.toBeUndefined();
    });
  });

  describe('up', () => {
    it('should recreate the index and refuse a duplicated slug again', async () => {
      // Given
      await TestHelper.blogPostSlugIndexMigration.down();

      // When
      await TestHelper.blogPostSlugIndexMigration.up();

      // Then
      expect(await TestHelper.blogPostSlugIndexMigration.indexExists()).toBe(
        true
      );
      await createBlogPostWithSlug(SLUG);
      await expect(createBlogPostWithSlug(SLUG)).rejects.toMatchObject({
        code: UNIQUE_VIOLATION_CODE,
      });
    });

    it('should not fail when the index already exists', async () => {
      // When
      const migration = TestHelper.blogPostSlugIndexMigration.up();

      // Then
      await expect(migration).resolves.toBeUndefined();
    });
  });
});
