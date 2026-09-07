import { toGlobalId } from 'graphql-relay/node/node.js';
import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';
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
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { NewsFeedDomain } from './news-feed.domain';

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
});
