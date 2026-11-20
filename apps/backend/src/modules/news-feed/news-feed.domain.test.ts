import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { NewsFeedItemMetadataKey as NewsFeedItemMetadataKeyModel } from '../../model/kanel/public/NewsFeedItemMetadata';
import { ProvisionedNewsFeedItemPlatformId } from '../../model/kanel/public/ProvisionedNewsFeedItem';
import type { BlogFeedItem } from '../../thirdparty/blog-api/schema';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { NewsFeedDomain } from './news-feed.domain';
import { blogpostProductMapping } from './news-feed.model';

describe('newsFeedDomain', () => {
  const tags = ['threat-intel', 'malware'];

  const createDocumentWithNewsFeedItem = async (itemTags: string[] = []) => {
    const document = await TestHelper.document.create({
      name: 'custom dashboard',
    });
    const newsFeedItem = await NewsFeedDomain.createResourceNewsFeedItem({
      document,
      serviceDefinitionIdentifier:
        ServiceDefinitionIdentifier.OpenctiCustomDashboards,
      type: NewsFeedItemType.ResourceCustomDashboard,
      platformIdentifier: PlatformIdentifier.Opencti,
      tags: itemTags,
    });
    return { document, newsFeedItem };
  };

  beforeEach(async () => {
    await TestHelper.newsFeed.deleteItem();
  });

  describe('loadAvailableNewsFeedTypes', () => {
    it('should return news feed types for OpenCTI platform', () => {
      const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
        PlatformIdentifier.Opencti
      );

      expect(result).toEqual(
        expect.arrayContaining([
          NewsFeedItemType.ResourceCustomDashboard,
          NewsFeedItemType.ResourcePlaybook,
        ])
      );
    });

    it('should return only the scenario news feed type when the platform is OpenAEV', () => {
      // When
      const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
        PlatformIdentifier.Openaev
      );

      // Then
      expect(result).toEqual([NewsFeedItemType.ResourceScenario]);
    });

    it.each`
      description                 | version         | expected
      ${'below the shipped gate'} | ${'7.261105.0'} | ${false}
      ${'at the shipped gate'}    | ${'7.261106.0'} | ${true}
      ${'above the shipped gate'} | ${'7.261107.0'} | ${true}
    `(
      'should list the blogpost type for OpenCTI $description ($version): $expected',
      ({ version, expected }) => {
        // When
        const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
          PlatformIdentifier.Opencti,
          version
        );

        // Then
        expect(result.includes(NewsFeedItemType.BlogPost)).toBe(expected);
      }
    );

    it.each`
      description                 | version         | expected
      ${'below the shipped gate'} | ${'3.261117.0'} | ${false}
      ${'at the shipped gate'}    | ${'3.261118.0'} | ${true}
      ${'above the shipped gate'} | ${'3.261119.0'} | ${true}
    `(
      'should list the blogpost type for OpenAEV $description ($version): $expected',
      ({ version, expected }) => {
        // When
        const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
          PlatformIdentifier.Openaev,
          version
        );

        // Then
        expect(result.includes(NewsFeedItemType.BlogPost)).toBe(expected);
      }
    );

    describe('with a blogpost required version', () => {
      const BLOGPOST_REQUIRED_VERSION = '7.260901.0';
      const originalBlogpostSupport =
        RequiredPlatformVersions.NewsFeedBlogpostSupport;

      const setRequiredVersion = (requiredVersion: string | null) => {
        RequiredPlatformVersions.NewsFeedBlogpostSupport = {
          [PlatformIdentifier.Opencti]: requiredVersion,
          [PlatformIdentifier.Openaev]: requiredVersion,
          [PlatformIdentifier.Xtmone]: null,
        };
      };

      afterEach(() => {
        RequiredPlatformVersions.NewsFeedBlogpostSupport =
          originalBlogpostSupport;
      });

      it.each`
        description         | requiredVersion              | version                      | expected
        ${'null required'}  | ${null}                      | ${'8.0.0'}                   | ${false}
        ${'below'}          | ${BLOGPOST_REQUIRED_VERSION} | ${'7.260831.0'}              | ${false}
        ${'equal'}          | ${BLOGPOST_REQUIRED_VERSION} | ${BLOGPOST_REQUIRED_VERSION} | ${true}
        ${'above'}          | ${BLOGPOST_REQUIRED_VERSION} | ${'7.260902.0'}              | ${true}
        ${'invalid'}        | ${BLOGPOST_REQUIRED_VERSION} | ${'not-a-version'}           | ${false}
        ${'missing (null)'} | ${BLOGPOST_REQUIRED_VERSION} | ${null}                      | ${false}
        ${'missing'}        | ${BLOGPOST_REQUIRED_VERSION} | ${undefined}                 | ${false}
      `(
        'should list the blogpost type for OpenCTI only when the version is $description ($expected)',
        ({ requiredVersion, version, expected }) => {
          // Given
          setRequiredVersion(requiredVersion);

          // When
          const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
            PlatformIdentifier.Opencti,
            version
          );

          // Then
          expect(result.includes(NewsFeedItemType.BlogPost)).toBe(expected);
          expect(result).toEqual(
            expect.arrayContaining([
              NewsFeedItemType.ResourceCustomDashboard,
              NewsFeedItemType.ResourcePlaybook,
            ])
          );
        }
      );

      it('should not list the blogpost type for a platform that is not mapped to a blog product', () => {
        // Given
        setRequiredVersion(BLOGPOST_REQUIRED_VERSION);
        RequiredPlatformVersions.NewsFeedBlogpostSupport = {
          ...RequiredPlatformVersions.NewsFeedBlogpostSupport,
          [PlatformIdentifier.Xtmone]: BLOGPOST_REQUIRED_VERSION,
        };

        // When
        const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
          PlatformIdentifier.Xtmone,
          '99.0.0'
        );

        // Then
        expect(result).toEqual([]);
      });

      it.each`
        description      | requiredVersion              | version                      | expected
        ${'disabled'}    | ${null}                      | ${'99.0.0'}                  | ${[NewsFeedItemType.ResourceScenario]}
        ${'not reached'} | ${BLOGPOST_REQUIRED_VERSION} | ${'7.260831.0'}              | ${[NewsFeedItemType.ResourceScenario]}
        ${'reached'}     | ${BLOGPOST_REQUIRED_VERSION} | ${BLOGPOST_REQUIRED_VERSION} | ${[NewsFeedItemType.ResourceScenario, NewsFeedItemType.BlogPost]}
      `(
        'should list the blogpost type for OpenAEV only when its gate is $description',
        ({ requiredVersion, version, expected }) => {
          // Given
          setRequiredVersion(requiredVersion);

          // When
          const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
            PlatformIdentifier.Openaev,
            version
          );

          // Then
          expect(result).toEqual(expected);
        }
      );
    });

    it('should return empty array for a platform with no configured news feed types', () => {
      const result = NewsFeedDomain.loadAvailableNewsFeedTypes(
        'UnknownIdentifier' as PlatformIdentifier
      );

      expect(result).toEqual([]);
    });
  });

  describe('loadAndConsumeProvisionedNewsFeedItems', () => {
    it('should return provisioned items with their metadata and remove them from the provisioned table', async () => {
      // Given
      const platformId = uuidv4();
      const item = await TestHelper.newsFeed.createItem({
        title: 'Test dashboard',
      });

      await NewsFeedDomain.provisionNewsFeedItem(item.id, [platformId]);

      // When
      const result =
        await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(platformId);

      // Then
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: item.id,
        type: NewsFeedItemType.ResourceCustomDashboard,
        title: 'Test dashboard',
      });
      expect(result[0]?.metadata).toBeDefined();

      const remainingProvisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: platformId as ProvisionedNewsFeedItemPlatformId,
      });
      expect(remainingProvisioned).toHaveLength(0);
    });

    it('should return empty array when no items are provisioned for the platform', async () => {
      const result =
        await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(uuidv4());

      expect(result).toEqual([]);
    });

    it('should not consume items provisioned for a different platform', async () => {
      // Given
      const platformId = uuidv4();
      const otherPlatformId = uuidv4();

      const item = await TestHelper.newsFeed.createItem({
        title: 'Test dashboard',
      });

      await NewsFeedDomain.provisionNewsFeedItem(item.id, [otherPlatformId]);

      // When
      const result =
        await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(platformId);

      // Then
      expect(result).toEqual([]);

      const remainingProvisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: otherPlatformId as ProvisionedNewsFeedItemPlatformId,
      });
      expect(remainingProvisioned).toHaveLength(1);
    });

    it('should return multiple items with their respective metadata', async () => {
      // Given
      const platformId = uuidv4();

      const item1 = await TestHelper.newsFeed.createItem({
        title: 'Dashboard 1',
      });
      const item2 = await TestHelper.newsFeed.createItem({
        title: 'Dashboard 2',
      });

      await NewsFeedDomain.provisionNewsFeedItem(item1.id, [platformId]);
      await NewsFeedDomain.provisionNewsFeedItem(item2.id, [platformId]);

      // When
      const result =
        await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(platformId);

      // Then
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(
        expect.arrayContaining([item1.id, item2.id])
      );

      const remainingProvisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: platformId as ProvisionedNewsFeedItemPlatformId,
      });
      expect(remainingProvisioned).toHaveLength(0);
    });

    describe('auto-cleanup of is_deleted items', () => {
      it.each`
        description                                                            | isDeleted | extraPlatforms | expectedToExist
        ${'hard-delete a soft-deleted item with no remaining provisions'}      | ${true}   | ${0}           | ${false}
        ${'keep a soft-deleted item still provisioned for another platform'}   | ${true}   | ${1}           | ${true}
        ${'keep a non-deleted item even after its last provision is consumed'} | ${false}  | ${0}           | ${true}
      `(
        'should $description',
        async ({
          isDeleted,
          extraPlatforms,
          expectedToExist,
        }: {
          isDeleted: boolean;
          extraPlatforms: number;
          expectedToExist: boolean;
        }) => {
          // Given
          const platformId = uuidv4();
          const additionalIds = Array.from({ length: extraPlatforms }, () =>
            uuidv4()
          );
          const item = await TestHelper.newsFeed.createItem({
            title: 'Test dashboard',
            is_deleted: isDeleted,
          });
          await NewsFeedDomain.provisionNewsFeedItem(item.id, [
            platformId,
            ...additionalIds,
          ]);

          // When
          await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(
            platformId
          );

          // Then
          const dbItem = await TestHelper.newsFeed.loadFirstItem({
            id: item.id,
          });
          if (expectedToExist) {
            expect(dbItem).toBeDefined();
          } else {
            expect(dbItem).toBeUndefined();
          }
        }
      );

      it('should hard-delete only is_deleted items and keep non-deleted items when both are consumed together', async () => {
        // Given
        const platformId = uuidv4();
        const deletedItem = await TestHelper.newsFeed.createItem({
          title: 'Deleted dashboard',
          is_deleted: true,
        });
        const activeItem = await TestHelper.newsFeed.createItem({
          title: 'Active dashboard',
          is_deleted: false,
        });

        await NewsFeedDomain.provisionNewsFeedItem(deletedItem.id, [
          platformId,
        ]);
        await NewsFeedDomain.provisionNewsFeedItem(activeItem.id, [platformId]);

        // When
        const result =
          await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(
            platformId
          );

        // Then — both items are returned by the consume call
        expect(result.map((r) => r.id)).toEqual(
          expect.arrayContaining([deletedItem.id, activeItem.id])
        );

        // The deleted item must be hard-deleted from DB
        const dbDeletedItem = await TestHelper.newsFeed.loadFirstItem({
          id: deletedItem.id,
        });
        expect(dbDeletedItem).toBeUndefined();

        // The active item must still exist
        const dbActiveItem = await TestHelper.newsFeed.loadFirstItem({
          id: activeItem.id,
        });
        expect(dbActiveItem).toBeDefined();
      });
    });
  });

  describe('createResourceNewsFeedItem', () => {
    it('should throw an error when document name is missing', async () => {
      const document = await TestHelper.document.create();
      document.name = '' as typeof document.name;

      await expect(
        NewsFeedDomain.createResourceNewsFeedItem({
          document,
          serviceDefinitionIdentifier:
            ServiceDefinitionIdentifier.OpenctiCustomDashboards,
          type: NewsFeedItemType.ResourceCustomDashboard,
          platformIdentifier: PlatformIdentifier.Opencti,
          tags: [],
        })
      ).rejects.toThrow(BadRequestErrorCode.NewsFeedItemMissingTitle);
    });

    it('should create a news feed item with the document name as title', async () => {
      const { document, newsFeedItem } =
        await createDocumentWithNewsFeedItem(tags);

      expect(newsFeedItem).toMatchObject({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: document.name,
        tags,
      });
      expect(newsFeedItem.id).toBeDefined();
      expect(newsFeedItem.creation_date).toEqual(expect.any(Date));
    });

    it('should persist the news feed item in the database', async () => {
      const { newsFeedItem } = await createDocumentWithNewsFeedItem(tags);

      const dbItem = await TestHelper.newsFeed.loadFirstItem({
        id: newsFeedItem.id,
      });

      expect(dbItem).toBeDefined();
      expect(dbItem).toMatchObject({
        id: newsFeedItem.id,
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        tags,
      });
    });

    it('should insert metadata with the url_path', async () => {
      const { document, newsFeedItem } = await createDocumentWithNewsFeedItem();

      const metadata = await TestHelper.newsFeed.loadFirstMetadata({
        news_feed_item_id: newsFeedItem.id,
        key: NewsFeedItemMetadataKey.UrlPath as NewsFeedItemMetadataKeyModel,
      });

      const expectedGlobalDocumentId = toGlobalId('Document', document.id);

      expect(metadata).toBeDefined();
      expect(metadata).toMatchObject({
        news_feed_item_id: newsFeedItem.id,
        key: NewsFeedItemMetadataKey.UrlPath,
        value: `redirect/${ServiceDefinitionIdentifier.OpenctiCustomDashboards}?document_id=${expectedGlobalDocumentId}`,
      });
    });
  });

  describe('loadNewsFeedItemTypeById', () => {
    it.each([NewsFeedItemType.BlogPost, NewsFeedItemType.ResourcePlaybook])(
      'should return the type %s of the item',
      async (type) => {
        // Given
        const item = await TestHelper.newsFeed.createItem({
          type,
          title: `item-of-type-${type}`,
        });

        // When
        const result = await NewsFeedDomain.loadNewsFeedItemTypeById(item.id);

        // Then
        expect(result).toBe(type);
      }
    );

    it('should return undefined when the item does not exist', async () => {
      // When
      const result = await NewsFeedDomain.loadNewsFeedItemTypeById(
        uuidv4() as NewsFeedItemId
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('loadNewsFeedItemByDocumentId', () => {
    it('should return undefined when no metadata matches the document id', async () => {
      const result =
        await NewsFeedDomain.loadNewsFeedItemByDocumentId(uuidv4());

      expect(result).toBeUndefined();
    });

    it('should return the news feed item linked to the given document id', async () => {
      // Given
      const { document, newsFeedItem } = await createDocumentWithNewsFeedItem();

      // When
      const result = await NewsFeedDomain.loadNewsFeedItemByDocumentId(
        document.id
      );

      // Then
      expect(result).toBeDefined();
      expect(result?.id).toBe(newsFeedItem.id);
    });

    it('should not return a news feed item linked to a different document id', async () => {
      // Given
      await createDocumentWithNewsFeedItem();

      // When
      const result =
        await NewsFeedDomain.loadNewsFeedItemByDocumentId(uuidv4());

      // Then
      expect(result).toBeUndefined();
    });

    it('should return undefined when the linked news feed item is soft-deleted', async () => {
      // Given
      const { document, newsFeedItem } = await createDocumentWithNewsFeedItem();
      await NewsFeedDomain.markNewsFeedItemAsDeleted(newsFeedItem.id);

      // When
      const result = await NewsFeedDomain.loadNewsFeedItemByDocumentId(
        document.id
      );

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('loadMetadataByNewsFeedItemIds', () => {
    it('should return the url_path metadata and exclude the document_id metadata', async () => {
      // Given
      const { document, newsFeedItem } = await createDocumentWithNewsFeedItem();
      const expectedGlobalDocumentId = toGlobalId('Document', document.id);

      // When
      const metadata = await NewsFeedDomain.loadMetadataByNewsFeedItemIds([
        newsFeedItem.id,
      ]);

      // Then
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        key: NewsFeedItemMetadataKey.UrlPath,
        value: `redirect/${ServiceDefinitionIdentifier.OpenctiCustomDashboards}?document_id=${expectedGlobalDocumentId}`,
      });
      expect(
        metadata.some((m) => m.key === NewsFeedItemMetadataKey.DocumentId)
      ).toBe(false);
    });

    it('should exclude the blog_post_slug metadata, which only serves the redirect', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'Blog post',
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.UrlPath,
        value: `redirect/news-feed/${item.id}`,
      });
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'threat-report-2026',
      });

      // When
      const metadata = await NewsFeedDomain.loadMetadataByNewsFeedItemIds([
        item.id,
      ]);

      // Then
      expect(metadata.map((m) => m.key)).toEqual([
        NewsFeedItemMetadataKey.UrlPath,
      ]);
    });

    it('should return the blog post display metadata and exclude the blog_post_slug', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        title: 'Blog post',
      });
      const displayMetadata = {
        [NewsFeedItemMetadataKey.UrlPath]: `redirect/news-feed/${item.id}`,
        [NewsFeedItemMetadataKey.Description]: 'How the integration works',
        [NewsFeedItemMetadataKey.ImageUrl]: 'https://filigran.io/image.png',
        [NewsFeedItemMetadataKey.ImageAlt]: 'Featured image',
        [NewsFeedItemMetadataKey.AuthorNames]: '["Romain Guignard"]',
        [NewsFeedItemMetadataKey.ReadMinutes]: '7',
      };
      for (const [key, value] of Object.entries(displayMetadata)) {
        await TestHelper.newsFeed.createMetadata({
          news_feed_item_id: item.id,
          key: key as NewsFeedItemMetadataKey,
          value,
        });
      }
      await TestHelper.newsFeed.createMetadata({
        news_feed_item_id: item.id,
        key: NewsFeedItemMetadataKey.BlogPostSlug,
        value: 'threat-report-2026',
      });

      // When
      const metadata = await NewsFeedDomain.loadMetadataByNewsFeedItemIds([
        item.id,
      ]);

      // Then
      expect(metadata).toHaveLength(Object.keys(displayMetadata).length);
      expect(metadata).toEqual(
        expect.arrayContaining(
          Object.entries(displayMetadata).map(([key, value]) =>
            expect.objectContaining({ key, value })
          )
        )
      );
      expect(metadata.map((m) => m.key)).not.toContain(
        NewsFeedItemMetadataKey.BlogPostSlug
      );
    });

    it('should return the metadata for multiple news feed items in a single call', async () => {
      // Given
      const first = await createDocumentWithNewsFeedItem();
      const second = await createDocumentWithNewsFeedItem();

      // When
      const metadata = await NewsFeedDomain.loadMetadataByNewsFeedItemIds([
        first.newsFeedItem.id,
        second.newsFeedItem.id,
      ]);

      // Then
      expect(
        metadata.filter((m) => m.news_feed_item_id === first.newsFeedItem.id)
      ).toHaveLength(1);
      expect(
        metadata.filter((m) => m.news_feed_item_id === second.newsFeedItem.id)
      ).toHaveLength(1);
    });

    it('should return an empty array when the news feed items have no metadata', async () => {
      const metadata = await NewsFeedDomain.loadMetadataByNewsFeedItemIds([
        uuidv4() as NewsFeedItemId,
      ]);

      expect(metadata).toEqual([]);
    });
  });

  describe('updateNewsFeedItem', () => {
    it('should update the title of an existing news feed item', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        title: 'Original title',
      });

      // When
      const updated = await NewsFeedDomain.updateNewsFeedItem(item.id, {
        title: 'Updated title',
        tags: [],
      });

      // Then
      expect(updated.title).toBe('Updated title');
      expect(updated.id).toBe(item.id);
    });

    it('should update the tags of an existing news feed item', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        title: 'Test item',
        tags: ['old-tag'],
      });

      // When
      const updated = await NewsFeedDomain.updateNewsFeedItem(item.id, {
        title: item.title,
        tags: ['new-tag-1', 'new-tag-2'],
      });

      // Then
      expect(updated.tags).toEqual(['new-tag-1', 'new-tag-2']);
    });

    it('should persist the updated values in the database', async () => {
      // Given
      const item = await TestHelper.newsFeed.createItem({
        title: 'Original title',
        tags: ['old-tag'],
      });

      // When
      await NewsFeedDomain.updateNewsFeedItem(item.id, {
        title: 'Persisted title',
        tags: ['persisted-tag'],
      });

      // Then
      const dbItem = await TestHelper.newsFeed.loadFirstItem({ id: item.id });
      expect(dbItem).toMatchObject({
        title: 'Persisted title',
        tags: ['persisted-tag'],
      });
    });

    it.each`
      description                        | newTitle        | newTags
      ${'title and tags simultaneously'} | ${'Combined'}   | ${['tag-a', 'tag-b']}
      ${'title to empty-ish string'}     | ${'  '}         | ${[]}
      ${'tags to empty array'}           | ${'Some title'} | ${[]}
    `(
      'should update $description',
      async ({
        newTitle,
        newTags,
      }: {
        newTitle: string;
        newTags: string[];
      }) => {
        // Given
        const item = await TestHelper.newsFeed.createItem({
          title: 'Initial title',
          tags: ['initial-tag'],
        });

        // When
        const updated = await NewsFeedDomain.updateNewsFeedItem(item.id, {
          title: newTitle,
          tags: newTags,
        });

        // Then
        expect(updated.title).toBe(newTitle);
        expect(updated.tags).toEqual(newTags);
      }
    );

    it('should not affect other news feed items when updating one', async () => {
      // Given
      const item1 = await TestHelper.newsFeed.createItem({
        title: 'Item 1',
        tags: ['tag-1'],
      });
      const item2 = await TestHelper.newsFeed.createItem({
        title: 'Item 2',
        tags: ['tag-2'],
      });

      // When
      await NewsFeedDomain.updateNewsFeedItem(item1.id, {
        title: 'Updated item 1',
        tags: ['updated-tag'],
      });

      // Then
      const dbItem2 = await TestHelper.newsFeed.loadFirstItem({ id: item2.id });
      expect(dbItem2).toMatchObject({ title: 'Item 2', tags: ['tag-2'] });
    });
  });

  describe('loadPaginatedNewsFeedItems', () => {
    it.each`
      description                            | itemCount | first | expectedEdges | expectedTotal | expectedHasNextPage
      ${'no items exist'}                    | ${0}      | ${10} | ${0}          | ${0}          | ${false}
      ${'item count is below the page size'} | ${2}      | ${10} | ${2}          | ${2}          | ${false}
      ${'item count exceeds the page size'}  | ${3}      | ${2}  | ${2}          | ${3}          | ${true}
    `(
      'should return the correct connection when $description',
      async ({
        itemCount,
        first,
        expectedEdges,
        expectedTotal,
        expectedHasNextPage,
      }: {
        itemCount: number;
        first: number;
        expectedEdges: number;
        expectedTotal: number;
        expectedHasNextPage: boolean;
      }) => {
        // Given
        for (let i = 0; i < itemCount; i++) {
          await TestHelper.newsFeed.createItem({ title: `Item ${i + 1}` });
        }

        // When
        const result = await NewsFeedDomain.loadPaginatedNewsFeedItems({
          first,
        });

        // Then
        expect(result.edges).toHaveLength(expectedEdges);
        expect(result.totalCount).toBe(`${expectedTotal}`);
        expect(result.pageInfo.hasNextPage).toBe(expectedHasNextPage);
      }
    );

    it('should return items ordered by creation date descending', async () => {
      // Given
      await TestHelper.newsFeed.createItem({
        title: 'Old item',
        creation_date: new Date('2024-01-01T00:00:00Z'),
      });
      await TestHelper.newsFeed.createItem({
        title: 'Recent item',
        creation_date: new Date('2024-06-01T00:00:00Z'),
      });

      // When
      const result = await NewsFeedDomain.loadPaginatedNewsFeedItems({
        first: 10,
      });

      // Then
      expect(result.edges[0]?.node.title).toBe('Recent item');
      expect(result.edges[1]?.node.title).toBe('Old item');
    });

    it('should navigate to the second page using the after cursor', async () => {
      // Given
      const items = [
        { title: 'Newest', creation_date: new Date('2024-03-01T00:00:00Z') },
        { title: 'Middle', creation_date: new Date('2024-02-01T00:00:00Z') },
        { title: 'Oldest', creation_date: new Date('2024-01-01T00:00:00Z') },
      ];
      for (const { title, creation_date } of items) {
        await TestHelper.newsFeed.createItem({ title, creation_date });
      }

      // When — first page
      const firstPage = await NewsFeedDomain.loadPaginatedNewsFeedItems({
        first: 2,
      });
      expect(firstPage.edges).toHaveLength(2);

      // When — second page
      const secondPage = await NewsFeedDomain.loadPaginatedNewsFeedItems({
        first: 2,
        after: firstPage.pageInfo.endCursor,
      });

      // Then
      expect(secondPage.edges).toHaveLength(1);
      expect(secondPage.edges[0]?.node.title).toBe('Oldest');
      expect(secondPage.pageInfo.hasNextPage).toBe(false);
    });

    it('should return correct cursors in edges', async () => {
      // Given
      await TestHelper.newsFeed.createItem({ title: 'Cursor test item' });

      // When
      const result = await NewsFeedDomain.loadPaginatedNewsFeedItems({
        first: 10,
      });

      // Then
      expect(result.pageInfo.startCursor).toBeDefined();
      expect(result.pageInfo.endCursor).toBeDefined();
      expect(result.edges[0]?.cursor).toBe(result.pageInfo.startCursor);
    });
  });

  describe('provisionNewsFeedItem', () => {
    let newsFeedItemId: NewsFeedItemId;

    beforeEach(async () => {
      const item = await TestHelper.newsFeed.createItem({
        title: 'Test Feed Item',
        id: uuidv4() as NewsFeedItemId,
      });
      expect(item).toBeDefined();
      newsFeedItemId = item.id;
    });

    it('should do nothing when platformIds is empty', async () => {
      await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, []);

      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: newsFeedItemId,
      });

      expect(provisioned).toHaveLength(0);
    });

    it('should insert a provisioned record for a single platform id', async () => {
      const platformId = 'platform-test-001';

      await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, [platformId]);

      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: newsFeedItemId,
      });

      expect(provisioned).toHaveLength(1);
      expect(provisioned[0]).toMatchObject({
        news_feed_item_id: newsFeedItemId,
        platform_id: platformId,
      });
    });

    it('should insert provisioned records for multiple platform ids', async () => {
      const platformIds = [
        'platform-test-001',
        'platform-test-002',
        'platform-test-003',
      ];

      await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds);

      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: newsFeedItemId,
      });

      expect(provisioned).toHaveLength(3);
      expect(provisioned.map((p) => p.platform_id)).toEqual(
        expect.arrayContaining(platformIds)
      );
    });

    it('should be idempotent when called twice with the same platform ids', async () => {
      const platformIds = ['platform-test-001', 'platform-test-002'];

      await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds);
      await expect(
        NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds)
      ).resolves.not.toThrow();

      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: newsFeedItemId,
      });

      expect(provisioned).toHaveLength(2);
      expect(provisioned.map((p) => p.platform_id)).toEqual(
        expect.arrayContaining(platformIds)
      );
    });

    it('should deduplicate platform ids and insert only unique records', async () => {
      const platformIds = [
        'platform-test-001',
        'platform-test-002',
        'platform-test-001',
        'platform-test-002',
        'platform-test-003',
      ];

      await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds);

      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: newsFeedItemId,
      });

      expect(provisioned).toHaveLength(3);
      expect(provisioned.map((p) => p.platform_id)).toEqual(
        expect.arrayContaining([
          'platform-test-001',
          'platform-test-002',
          'platform-test-003',
        ])
      );
    });
  });

  describe('provisionLatestBlogpostsToPlatform', () => {
    const platformId = uuidv4();

    const createBlogpost = (
      daysAgo: number,
      overrides: Parameters<typeof TestHelper.newsFeed.createItem>[0] = {}
    ) =>
      TestHelper.newsFeed.createItem({
        title: `Blogpost ${daysAgo} days ago`,
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Opencti,
        creation_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        ...overrides,
      });

    it('should provision only the newest active blogposts up to the limit', async () => {
      // Given
      const newest = await createBlogpost(1);
      const second = await createBlogpost(2);
      await createBlogpost(3);

      // When
      const provisionedIds =
        await NewsFeedDomain.provisionLatestBlogpostsToPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          limit: 2,
        });

      // Then
      expect(provisionedIds).toEqual([newest.id, second.id]);
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: platformId,
      });
      expect(provisioned.map((row) => row.news_feed_item_id).sort()).toEqual(
        [newest.id, second.id].sort()
      );
    });

    it('should skip deleted blogposts, other types and other products', async () => {
      // Given
      const active = await createBlogpost(5);
      await createBlogpost(1, { is_deleted: true });
      await createBlogpost(2, {
        type: NewsFeedItemType.ResourceCustomDashboard,
      });
      await createBlogpost(3, {
        platform_identifier: PlatformIdentifier.Openaev,
      });

      // When
      const provisionedIds =
        await NewsFeedDomain.provisionLatestBlogpostsToPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          limit: 6,
        });

      // Then
      expect(provisionedIds).toEqual([active.id]);
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: platformId,
      });
      expect(provisioned).toMatchObject([
        { news_feed_item_id: active.id, platform_id: platformId },
      ]);
    });

    it('should provision nothing when the product has no blogpost', async () => {
      // When
      const provisionedIds =
        await NewsFeedDomain.provisionLatestBlogpostsToPlatform({
          platformId,
          platformIdentifier: PlatformIdentifier.Opencti,
          limit: 6,
        });

      // Then
      expect(provisionedIds).toEqual([]);
      expect(
        await TestHelper.newsFeed.loadProvisioned({ platform_id: platformId })
      ).toHaveLength(0);
    });

    it('should be idempotent when called twice for the same platform', async () => {
      // Given
      const blogpost = await createBlogpost(1);
      const input = {
        platformId,
        platformIdentifier: PlatformIdentifier.Opencti,
        limit: 6,
      };
      await NewsFeedDomain.provisionLatestBlogpostsToPlatform(input);

      // When
      await NewsFeedDomain.provisionLatestBlogpostsToPlatform(input);

      // Then
      const provisioned = await TestHelper.newsFeed.loadProvisioned({
        platform_id: platformId,
      });
      expect(provisioned).toMatchObject([
        { news_feed_item_id: blogpost.id, platform_id: platformId },
      ]);
    });
  });

  describe('deleteNewsFeedItemsOlderThan', () => {
    const REFERENCE_NOW = new Date();

    const monthsAgo = (months: number): Date => {
      const date = new Date(REFERENCE_NOW);
      date.setMonth(date.getMonth() - months);
      return date;
    };

    const createItemWithAge = (ageInMonths: number) =>
      TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.ResourceCustomDashboard,
        platform_identifier: PlatformIdentifier.Opencti,
        title: `item-${ageInMonths}-months-old`,
        creation_date: monthsAgo(ageInMonths),
        tags: [],
      });

    it.each`
      ageInMonths | cutoffMonths | shouldBeDeleted | description
      ${7}        | ${6}         | ${true}         | ${'older than cutoff is deleted'}
      ${6}        | ${6}         | ${false}        | ${'exactly at cutoff boundary is kept'}
      ${5}        | ${6}         | ${false}        | ${'within cutoff is kept'}
      ${1}        | ${6}         | ${false}        | ${'recent is kept'}
      ${24}       | ${6}         | ${true}         | ${'much older is deleted'}
      ${3}        | ${1}         | ${true}         | ${'older than custom 1-month cutoff is deleted'}
    `(
      'should handle item aged $ageInMonths months with $cutoffMonths-month cutoff ($description)',
      async ({ ageInMonths, cutoffMonths, shouldBeDeleted }) => {
        // Given
        const item = await createItemWithAge(ageInMonths);

        // When
        await NewsFeedDomain.deleteNewsFeedItemsOlderThan(
          monthsAgo(cutoffMonths)
        );

        // Then
        const remaining = await TestHelper.newsFeed.loadFirstItem({
          id: item.id,
        });
        expect(remaining === undefined).toBe(shouldBeDeleted);
      }
    );

    describe('blog posts', () => {
      const createExpiredBlogPost = (
        isDeleted: boolean,
        platformIdentifier: PlatformIdentifier
      ) =>
        TestHelper.newsFeed.createItem({
          type: NewsFeedItemType.BlogPost,
          platform_identifier: platformIdentifier,
          title: 'expired-blog-post',
          creation_date: monthsAgo(24),
          is_deleted: isDeleted,
        });

      const BLOG_PRODUCTS = Object.values(blogpostProductMapping);

      it.each(BLOG_PRODUCTS)(
        'should keep an expired blog post of %s that is not deleted',
        async (platformIdentifier) => {
          // Given
          const liveBlogPost = await createExpiredBlogPost(
            false,
            platformIdentifier
          );
          const expiredResource = await createItemWithAge(24);

          // When
          const deletedCount =
            await NewsFeedDomain.deleteNewsFeedItemsOlderThan(monthsAgo(6));

          // Then
          expect(deletedCount).toBe(1);
          expect(
            await TestHelper.newsFeed.loadFirstItem({ id: liveBlogPost.id })
          ).toMatchObject({ id: liveBlogPost.id, is_deleted: false });
          expect(
            await TestHelper.newsFeed.loadFirstItem({ id: expiredResource.id })
          ).toBeUndefined();
        }
      );

      it.each(BLOG_PRODUCTS)(
        'should delete an expired blog post of %s that is already deleted',
        async (platformIdentifier) => {
          // Given
          const deletedBlogPost = await createExpiredBlogPost(
            true,
            platformIdentifier
          );

          // When
          const deletedCount =
            await NewsFeedDomain.deleteNewsFeedItemsOlderThan(monthsAgo(6));

          // Then
          expect(deletedCount).toBe(1);
          expect(
            await TestHelper.newsFeed.loadFirstItem({ id: deletedBlogPost.id })
          ).toBeUndefined();
        }
      );

      it.each(BLOG_PRODUCTS)(
        'should keep an expired deleted blog post of %s while a platform has not consumed its deletion',
        async (platformIdentifier) => {
          // Given
          const deletedBlogPost = await createExpiredBlogPost(
            true,
            platformIdentifier
          );
          const platformId = uuidv4();
          await NewsFeedDomain.provisionNewsFeedItem(deletedBlogPost.id, [
            platformId,
          ]);

          // When
          const deletedCount =
            await NewsFeedDomain.deleteNewsFeedItemsOlderThan(monthsAgo(6));

          // Then
          expect(deletedCount).toBe(0);
          expect(
            await TestHelper.newsFeed.loadFirstItem({ id: deletedBlogPost.id })
          ).toMatchObject({ id: deletedBlogPost.id, is_deleted: true });
          expect(
            await TestHelper.newsFeed.loadProvisioned({
              news_feed_item_id: deletedBlogPost.id,
            })
          ).toHaveLength(1);
        }
      );
    });

    it('should return the count of deleted items', async () => {
      // Given
      await createItemWithAge(12);
      await createItemWithAge(9);
      await createItemWithAge(7);
      await createItemWithAge(1);
      await createItemWithAge(2);

      // When
      const deletedCount = await NewsFeedDomain.deleteNewsFeedItemsOlderThan(
        monthsAgo(6)
      );

      // Then
      expect(deletedCount).toBe(3);
    });

    it('should return 0 when no items are older than cutoff', async () => {
      // Given
      await createItemWithAge(1);

      // When
      const deletedCount = await NewsFeedDomain.deleteNewsFeedItemsOlderThan(
        monthsAgo(6)
      );

      // Then
      expect(deletedCount).toBe(0);
    });

    it('should cascade-delete provisioned items linked to deleted news feed items', async () => {
      // Given
      const oldItem = await createItemWithAge(12);
      const platformId = uuidv4();
      await NewsFeedDomain.provisionNewsFeedItem(oldItem.id, [platformId]);

      const remainingBefore = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: oldItem.id,
      });
      expect(remainingBefore).toHaveLength(1);

      // When
      await NewsFeedDomain.deleteNewsFeedItemsOlderThan(monthsAgo(6));

      // Then
      const remainingAfter = await TestHelper.newsFeed.loadProvisioned({
        news_feed_item_id: oldItem.id,
      });
      expect(remainingAfter).toHaveLength(0);
    });
  });

  describe('countActiveBlogpostItems', () => {
    const createBlogpost = (
      overrides: Parameters<typeof TestHelper.newsFeed.createItem>[0] = {}
    ) =>
      TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Openaev,
        title: 'A blog post',
        ...overrides,
      });

    it('should count the active blog items with a key of the product only', async () => {
      // Given
      await createBlogpost({ key: 'active-post' });
      await createBlogpost({ key: 'other-active-post' });
      await createBlogpost({ key: 'deleted-post', is_deleted: true });
      await createBlogpost({ key: null });
      await createBlogpost({
        key: 'other-product-post',
        platform_identifier: PlatformIdentifier.Opencti,
      });
      await createBlogpost({
        key: 'playbook',
        type: NewsFeedItemType.ResourcePlaybook,
      });

      // When
      const count = await NewsFeedDomain.countActiveBlogpostItems(
        PlatformIdentifier.Openaev
      );

      // Then
      expect(count).toBe(2);
    });
  });

  describe('news feed item key', () => {
    const UNIQUE_VIOLATION = '23505';
    const KEY = 'a-blog-post';

    const createKeyedItem = (
      overrides: Parameters<typeof TestHelper.newsFeed.createItem>[0] = {}
    ) =>
      TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: PlatformIdentifier.Opencti,
        title: 'A blog post',
        key: KEY,
        ...overrides,
      });

    it('should refuse a second item with the same platform identifier, type and key', async () => {
      // Given
      await createKeyedItem({ title: 'First' });

      // When
      const secondItem = createKeyedItem({ title: 'Second' });

      // Then
      await expect(secondItem).rejects.toMatchObject({
        code: UNIQUE_VIOLATION,
      });
      expect(await TestHelper.newsFeed.loadItems({ key: KEY })).toMatchObject([
        { title: 'First' },
      ]);
    });

    it.each([
      [
        'on another platform identifier',
        { platform_identifier: PlatformIdentifier.Openaev },
      ],
      ['with another type', { type: NewsFeedItemType.ResourcePlaybook }],
    ])(
      'should accept a second item with the same key %s',
      async (_description, secondItemOverrides) => {
        // Given
        await createKeyedItem({ title: 'First' });

        // When
        const secondItem = await createKeyedItem({
          title: 'Second',
          ...secondItemOverrides,
        });

        // Then
        expect(secondItem).toMatchObject({ key: KEY, ...secondItemOverrides });
        expect(await TestHelper.newsFeed.loadItems({ key: KEY })).toHaveLength(
          2
        );
      }
    );

    it.each([[null], [undefined]])(
      'should accept several items of the same platform identifier and type when their key is %s',
      async (key) => {
        // Given
        await createKeyedItem({ title: 'First', key });

        // When
        const secondItem = await createKeyedItem({ title: 'Second', key });

        // Then
        expect(secondItem).toMatchObject({ title: 'Second', key: null });
        expect(await TestHelper.newsFeed.loadItems({ key: null })).toHaveLength(
          2
        );
      }
    );
  });

  describe('reconcileBlogposts', () => {
    const buildPost = (
      slug: string,
      overrides: Partial<BlogFeedItem> = {}
    ): BlogFeedItem => ({
      id: `post-${slug}`,
      slug,
      title: `Title of ${slug}`,
      summary: null,
      image: null,
      authors: [],
      categories: [],
      products: ['opencti', 'openaev'],
      read_minutes: undefined,
      published_at: '2026-09-01T08:00:00.000Z',
      ...overrides,
    });

    const createBlogpost = (
      platformIdentifier: PlatformIdentifier,
      key: string | null,
      overrides: Parameters<typeof TestHelper.newsFeed.createItem>[0] = {}
    ) =>
      TestHelper.newsFeed.createItem({
        type: NewsFeedItemType.BlogPost,
        platform_identifier: platformIdentifier,
        title: `Existing ${key}`,
        key,
        ...overrides,
      });

    it.each([PlatformIdentifier.Opencti, PlatformIdentifier.Openaev])(
      'should create the items of %s with the slug of the posts as key, for this product only',
      async (platformIdentifier) => {
        // When
        const result = await NewsFeedDomain.reconcileBlogposts({
          platformIdentifier,
          posts: [buildPost('post-a'), buildPost('post-b')],
        });

        // Then
        expect(result.created).toHaveLength(2);
        const items = await TestHelper.newsFeed.loadItems();
        expect(items).toHaveLength(2);
        expect(items).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              platform_identifier: platformIdentifier,
              type: NewsFeedItemType.BlogPost,
              key: 'post-a',
            }),
            expect.objectContaining({
              platform_identifier: platformIdentifier,
              type: NewsFeedItemType.BlogPost,
              key: 'post-b',
            }),
          ])
        );
      }
    );

    it('should only update the item of the product when another product holds the same key', async () => {
      // Given
      const openCtiItem = await createBlogpost(
        PlatformIdentifier.Opencti,
        'post-a'
      );
      const openAevItem = await createBlogpost(
        PlatformIdentifier.Openaev,
        'post-a'
      );

      // When
      const result = await NewsFeedDomain.reconcileBlogposts({
        platformIdentifier: PlatformIdentifier.Openaev,
        posts: [buildPost('post-a', { title: 'A new title' })],
      });

      // Then
      expect(result).toEqual({
        created: [],
        updated: [openAevItem.id],
        dropped: [],
        restored: [],
      });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: openAevItem.id })
      ).toMatchObject({ title: 'A new title', key: 'post-a' });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: openCtiItem.id })
      ).toMatchObject({ title: 'Existing post-a', key: 'post-a' });
    });

    it('should drop only the active items of the product that are not in its feed', async () => {
      // Given
      const openCtiItems = [
        await createBlogpost(PlatformIdentifier.Opencti, 'post-a'),
        await createBlogpost(PlatformIdentifier.Opencti, 'post-b'),
      ];
      const openAevKept = await createBlogpost(
        PlatformIdentifier.Openaev,
        'post-a'
      );
      const openAevDropped = await createBlogpost(
        PlatformIdentifier.Openaev,
        'post-b'
      );

      // When
      const result = await NewsFeedDomain.reconcileBlogposts({
        platformIdentifier: PlatformIdentifier.Openaev,
        posts: [buildPost('post-a')],
      });

      // Then
      expect(result.dropped).toEqual([openAevDropped.id]);
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: openAevDropped.id })
      ).toMatchObject({ is_deleted: true });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: openAevKept.id })
      ).toMatchObject({ is_deleted: false });
      expect(
        await TestHelper.newsFeed.loadItems({
          platform_identifier: PlatformIdentifier.Opencti,
          is_deleted: false,
        })
      ).toHaveLength(openCtiItems.length);
    });

    it('should bring back a dropped item of the product instead of creating another one', async () => {
      // Given
      const droppedItem = await createBlogpost(
        PlatformIdentifier.Openaev,
        'post-a',
        { is_deleted: true }
      );

      // When
      const result = await NewsFeedDomain.reconcileBlogposts({
        platformIdentifier: PlatformIdentifier.Openaev,
        posts: [buildPost('post-a')],
      });

      // Then
      expect(result).toMatchObject({
        created: [],
        restored: [droppedItem.id],
      });
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: droppedItem.id })
      ).toMatchObject({ is_deleted: false, key: 'post-a' });
    });

    it('should neither match nor drop an active blog item without key', async () => {
      // Given
      const itemWithoutKey = await createBlogpost(
        PlatformIdentifier.Opencti,
        null
      );

      // When
      const result = await NewsFeedDomain.reconcileBlogposts({
        platformIdentifier: PlatformIdentifier.Opencti,
        posts: [buildPost('post-a')],
      });

      // Then
      expect(result.created).toHaveLength(1);
      expect(result.dropped).toEqual([]);
      expect(
        await TestHelper.newsFeed.loadFirstItem({ id: itemWithoutKey.id })
      ).toMatchObject({ is_deleted: false, key: null });
    });
  });
});
