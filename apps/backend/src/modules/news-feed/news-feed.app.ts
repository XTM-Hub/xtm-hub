import config from 'config';
import { z } from 'zod';
import {
  ConsumeProvisionedNewsFeedItemsResponse,
  DocumentStatus,
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import { withTransaction } from '../../context/database.context';
import Document, { DocumentId } from '../../model/kanel/public/Document';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';
import { BlogApiClient } from '../../thirdparty/blog-api/client';
import { BlogApiError } from '../../thirdparty/blog-api/errors';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode } from '../../utils/error/error.code';
import { PlatformIdentifierToString } from '../../utils/platform';
import { isLtsVersion } from '../../utils/versioning';
import {
  INTERVAL_UNITS,
  IntervalHelper,
  IntervalUnit,
} from '../common/interval.helper';
import type { FullPlatformConfiguration } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { platformIdentifierMappedByServiceDefinitionIdentifier } from '../registration/registration.mapping';
import { ServiceDefinitionDomain } from '../service/definition/service-definition.domain';
import { useCaseDomain } from '../use-case/use-case.domain';
import {
  buildNewsFeedDestination,
  NewsFeedMetadataValues,
  NewsFeedRedirectHelper,
  shouldAddUtmToUrlPath,
} from './news-feed-redirect.helper';
import { NewsFeedDomain } from './news-feed.domain';
import {
  doesPlatformSupportBlogpostNewsFeed,
  doesPlatformSupportGithubReleaseNewsFeed,
  doesPlatformSupportNewsFeed,
  NewsFeedHelper,
} from './news-feed.helper';
import {
  BlogpostProduct,
  blogpostProductMapping,
  githubReleaseRepositoryMapping,
  NEWS_FEED_INTERNAL_METADATA_KEYS,
  newsFeedConfigurationMapping,
} from './news-feed.model';

const getSupportedPlatformIds = (
  registeredPlatforms: {
    platform_id: string;
    platform_version: string | null;
  }[],
  platformIdentifier: PlatformIdentifier
): string[] =>
  registeredPlatforms
    .filter((platform) =>
      doesPlatformSupportNewsFeed(platformIdentifier, platform.platform_version)
    )
    .map((platform) => platform.platform_id);

const provisionNewsFeedItemForAllSupportedPlatforms = async ({
  newsFeedItemId,
  platformIdentifier,
}: {
  newsFeedItemId: NewsFeedItemId;
  platformIdentifier: PlatformIdentifier;
}): Promise<void> => {
  const registeredPlatforms =
    await RegistrationDomain.loadAllActiveRegisteredPlatformsByPlatformIdentifier(
      platformIdentifier
    );
  const platformIds = getSupportedPlatformIds(
    registeredPlatforms,
    platformIdentifier
  );
  await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds);
};

// Same as provisionNewsFeedItemForAllSupportedPlatforms for several items, with the platforms filtered by the given
// predicate instead of the news feed version gate, and by release track when isLts is given. Returns the number of
// platforms the items are provisioned to.
const provisionNewsFeedItemsForPlatformsMatching = async ({
  newsFeedItemIds,
  platformIdentifier,
  isPlatformSupported,
  isLts,
}: {
  newsFeedItemIds: NewsFeedItemId[];
  platformIdentifier: PlatformIdentifier;
  isPlatformSupported: (platform: {
    platform_id: string;
    platform_version: string | null;
  }) => boolean;
  isLts?: boolean;
}): Promise<number> => {
  if (newsFeedItemIds.length === 0) {
    return 0;
  }

  const registeredPlatforms =
    await RegistrationDomain.loadAllActiveRegisteredPlatformsByPlatformIdentifier(
      platformIdentifier,
      { isLts }
    );
  const platformIds = [
    ...new Set(
      registeredPlatforms
        .filter(isPlatformSupported)
        .map((platform) => platform.platform_id)
    ),
  ];
  for (const newsFeedItemId of newsFeedItemIds) {
    await NewsFeedDomain.provisionNewsFeedItem(newsFeedItemId, platformIds);
  }
  return platformIds.length;
};

const provisionGithubReleaseNewsFeedItem = ({
  newsFeedItemId,
  platformIdentifier,
  isLts,
}: {
  newsFeedItemId: NewsFeedItemId;
  platformIdentifier: PlatformIdentifier;
  isLts?: boolean;
}): Promise<number> =>
  provisionNewsFeedItemsForPlatformsMatching({
    newsFeedItemIds: [newsFeedItemId],
    platformIdentifier,
    isPlatformSupported: (platform) =>
      doesPlatformSupportGithubReleaseNewsFeed(
        platformIdentifier,
        platform.platform_version
      ),
    isLts,
  });

export interface BlogpostSyncCounts {
  created: number;
  // Includes the items that come back after having been dropped
  updated: number;
  dropped: number;
  provisionedPlatforms: number;
}

// The totals of all the products, and the same counts for each of them
export interface BlogpostSyncResult extends BlogpostSyncCounts {
  products: Record<BlogpostProduct, BlogpostSyncCounts>;
}

// Object.entries loses the keys type: the mapping is a closed Record, so its keys are exactly the BlogpostProduct
const BLOGPOST_PRODUCTS = Object.entries(blogpostProductMapping) as [
  BlogpostProduct,
  PlatformIdentifier,
][];

const resolvePlatformIdentifier = async (
  serviceInstanceId: ServiceInstanceId
): Promise<PlatformIdentifier | undefined> => {
  const serviceDefinition =
    await ServiceDefinitionDomain.loadServiceDefinitionByServiceInstance(
      serviceInstanceId
    );
  return serviceDefinition
    ? platformIdentifierMappedByServiceDefinitionIdentifier[
        serviceDefinition.identifier
      ]
    : undefined;
};

export interface NewsFeedExternalRedirect {
  newsFeedItemId: NewsFeedItemId;
  newsFeedItemType: NewsFeedItemType;
  // The product the item was given to, reported in telemetry
  platformIdentifier: PlatformIdentifier;
  url: string;
  host: string;
}

const NEWS_FEED_ITEM_ID_SCHEMA = z.uuid();

const buildBlogpostSyncResult = (
  products: Record<BlogpostProduct, BlogpostSyncCounts>
): BlogpostSyncResult => {
  const sum = (field: keyof BlogpostSyncCounts): number =>
    Object.values(products).reduce((total, counts) => total + counts[field], 0);
  return {
    created: sum('created'),
    updated: sum('updated'),
    dropped: sum('dropped'),
    provisionedPlatforms: sum('provisionedPlatforms'),
    products,
  };
};

// Fetches the blog API first, outside any transaction: nothing is applied unless the whole response is valid.
// Then reconciles and provisions the items of the product in a single transaction.
const syncBlogpostsOfProduct = async ({
  product,
  platformIdentifier,
  limit,
}: {
  product: BlogpostProduct;
  platformIdentifier: PlatformIdentifier;
  limit: number;
}): Promise<BlogpostSyncCounts> => {
  const posts = await BlogApiClient.fetchBlogFeed({ product, limit });

  return withTransaction(async () => {
    // Safeguard: an empty answer must not empty the news feed of the product
    if (
      posts.length === 0 &&
      (await NewsFeedDomain.countActiveBlogpostItems(platformIdentifier)) > 0
    ) {
      throw new Error(ErrorCode.NewsFeedBlogpostEmptyFeed);
    }

    const { created, updated, dropped, restored } =
      await NewsFeedDomain.reconcileBlogposts({
        platformIdentifier,
        posts,
      });

    // The dropped items are provisioned too, so that the platforms delete them
    const provisionedPlatforms =
      await provisionNewsFeedItemsForPlatformsMatching({
        newsFeedItemIds: [
          ...new Set([...created, ...updated, ...restored, ...dropped]),
        ],
        platformIdentifier,
        isPlatformSupported: (platform) =>
          doesPlatformSupportBlogpostNewsFeed(
            platformIdentifier,
            platform.platform_version
          ),
      });

    return {
      created: created.length,
      updated: updated.length + restored.length,
      dropped: dropped.length,
      provisionedPlatforms,
    };
  });
};

export const NewsFeedApp = {
  // The destination only depends on the item (its type and metadata): nothing from the request decides it,
  // except the standard utm parameters that are forwarded when the destination accepts them.
  // Returns undefined for anything that cannot produce a safe destination, without telling why.
  resolveExternalRedirect: async ({
    newsFeedItemId,
    query,
  }: {
    newsFeedItemId: string;
    query: Record<string, unknown>;
  }): Promise<NewsFeedExternalRedirect | undefined> => {
    const parsedItemId = NEWS_FEED_ITEM_ID_SCHEMA.safeParse(newsFeedItemId);
    if (!parsedItemId.success) {
      return undefined;
    }

    const newsFeedItem = await NewsFeedDomain.loadNewsFeedItemWithMetadataById(
      parsedItemId.data as NewsFeedItemId
    );
    if (!newsFeedItem || newsFeedItem.is_deleted) {
      return undefined;
    }

    const metadata: NewsFeedMetadataValues = Object.fromEntries(
      newsFeedItem.metadata.map(({ key, value }) => [key, value])
    );
    const destination = buildNewsFeedDestination(
      newsFeedItem.type,
      metadata,
      newsFeedItem.platform_identifier
    );
    if (!destination) {
      return undefined;
    }

    return {
      newsFeedItemId: newsFeedItem.id,
      newsFeedItemType: newsFeedItem.type,
      platformIdentifier: newsFeedItem.platform_identifier,
      host: destination.host,
      url: destination.forwardUtmParams
        ? NewsFeedRedirectHelper.appendUtmParams(destination.url, query)
        : destination.url,
    };
  },

  // Each product is synchronized on its own, one after the other: it fetches the blog API first, outside any
  // transaction, then reconciles and provisions in a single transaction of its own. A failing product rolls back
  // only itself, provisioning included, and does not stop the others. Each failure is logged with its product, and a
  // NewsFeedBlogpostSyncFailed error is thrown once all of them have been tried, so that the caller knows that
  // something is left to fix.
  syncBlogposts: async (): Promise<BlogpostSyncResult> => {
    const limit = NewsFeedHelper.getBlogpostLimit();
    const succeeded: [BlogpostProduct, BlogpostSyncCounts][] = [];
    const failures: { product: BlogpostProduct; error: unknown }[] = [];

    for (const [product, platformIdentifier] of BLOGPOST_PRODUCTS) {
      try {
        succeeded.push([
          product,
          await syncBlogpostsOfProduct({
            product,
            platformIdentifier,
            limit,
          }),
        ]);
      } catch (error) {
        failures.push({ product, error });
        logApp.error('Unable to synchronize the blog posts of a product', {
          error,
          product,
          postId: error instanceof BlogApiError ? error.postId : undefined,
        });
      }
    }

    if (failures.length > 0) {
      logApp.warn('Synchronized the blog posts of some products only', {
        synchronized: Object.fromEntries(succeeded),
        failedProducts: failures.map(({ product }) => product),
      });
      // The other products are already applied. The failed products and the reasons are in the logs above.
      throw new Error(ErrorCode.NewsFeedBlogpostSyncFailed, {
        cause: failures[0]?.error,
      });
    }

    // Object.fromEntries loses the keys type: without any failure, every mapped product has succeeded
    const result = buildBlogpostSyncResult(
      Object.fromEntries(succeeded) as Record<
        BlogpostProduct,
        BlogpostSyncCounts
      >
    );
    logApp.info('Synchronized blog posts', { ...result });
    return result;
  },

  consumeProvisionedNewsFeedItems: async ({
    registration,
  }: {
    registration: FullPlatformConfiguration;
  }): Promise<ConsumeProvisionedNewsFeedItemsResponse> => {
    const rawItems =
      await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(
        registration.platformConfiguration.platform_id
      );

    const newsFeedItems = rawItems.map((item) => ({
      ...item,
      metadata: item.metadata
        .filter(
          (m) =>
            !NEWS_FEED_INTERNAL_METADATA_KEYS.includes(
              m.key as NewsFeedItemMetadataKey
            )
        )
        .map((m) => ({
          key: m.key as NewsFeedItemMetadataKey,
          value:
            m.key === NewsFeedItemMetadataKey.UrlPath &&
            m.value &&
            shouldAddUtmToUrlPath(item.type)
              ? NewsFeedHelper.addUtmToUrlPath({
                  urlPath: m.value,
                  type: item.type,
                  // The consuming platform is where the link is clicked
                  platformIdentifier: registration.platformIdentifier,
                })
              : m.value,
        })),
    }));

    return {
      news_feed_items: newsFeedItems,
      available_news_feed_types: NewsFeedDomain.loadAvailableNewsFeedTypes(
        registration.platformIdentifier,
        registration.platformConfiguration.platform_version
      ),
    };
  },

  // Gives a platform the latest blogpost items of its product, without waiting for the next post. It never throws:
  // it runs after the registration or the version change is committed and must not break it.
  backfillBlogpostsForPlatform: async ({
    platformId,
    platformIdentifier,
    platformVersion,
  }: {
    platformId: string;
    platformIdentifier: PlatformIdentifier;
    platformVersion?: string | null;
  }): Promise<void> => {
    try {
      const isBlogpostProduct = Object.values(blogpostProductMapping).includes(
        platformIdentifier
      );
      if (
        !isBlogpostProduct ||
        !doesPlatformSupportBlogpostNewsFeed(
          platformIdentifier,
          platformVersion
        )
      ) {
        return;
      }

      await NewsFeedDomain.provisionLatestBlogpostsToPlatform({
        platformId,
        platformIdentifier,
        limit: NewsFeedHelper.getBlogpostLimit(),
      });
    } catch (error) {
      logApp.error('Unable to backfill blogpost news feed items', {
        error,
        platformId,
        platformIdentifier,
      });
    }
  },

  // Backfills only when the platform goes from a version that does not support blogpost items to one that does:
  // neither a downgrade nor a change between two supporting versions. The identifier is resolved from the service
  // definition of the platform when the caller does not know it. It never throws.
  backfillBlogpostsOnVersionChange: async ({
    serviceInstanceId,
    platformId,
    platformIdentifier,
    previousVersion,
    newVersion,
  }: {
    serviceInstanceId: ServiceInstanceId;
    platformId: string;
    platformIdentifier?: PlatformIdentifier;
    previousVersion?: string | null;
    newVersion: string;
  }): Promise<void> => {
    try {
      const resolvedIdentifier =
        platformIdentifier ??
        (await resolvePlatformIdentifier(serviceInstanceId));
      if (
        !resolvedIdentifier ||
        doesPlatformSupportBlogpostNewsFeed(resolvedIdentifier, previousVersion)
      ) {
        return;
      }

      await NewsFeedApp.backfillBlogpostsForPlatform({
        platformId,
        platformIdentifier: resolvedIdentifier,
        platformVersion: newVersion,
      });
    } catch (error) {
      logApp.error('Unable to backfill blogpost news feed items', {
        error,
        platformId,
        serviceInstanceId,
      });
    }
  },

  // No lock: a plain lookup, then the write. newProductVersion is called once per release. Should two calls overlap,
  // the unique index makes the loser fail and roll back its transaction.
  createGithubReleaseNewsFeedItem: async ({
    product,
    version,
  }: {
    product: PlatformIdentifier;
    version: string;
  }): Promise<void> => {
    if (githubReleaseRepositoryMapping[product] === undefined) {
      return;
    }

    const existingItem =
      await NewsFeedDomain.loadGithubReleaseItemByProductVersion({
        platformIdentifier: product,
        productVersion: version,
      });
    if (existingItem) {
      return;
    }

    // One transaction: a failed provisioning rolls the item back, else the existing item would block every retry
    await withTransaction(async () => {
      const newsFeedItem = await NewsFeedDomain.createGithubReleaseNewsFeedItem(
        {
          platformIdentifier: product,
          title: `${PlatformIdentifierToString[product]} ${version}`,
          productVersion: version,
        }
      );

      // An LTS customer does not want the non-LTS releases, and the reverse
      await provisionGithubReleaseNewsFeedItem({
        newsFeedItemId: newsFeedItem.id,
        platformIdentifier: product,
        isLts: isLtsVersion(version),
      });
    });
  },

  createResourceNewsFeedItem: async ({
    document,
    serviceDefinitionIdentifier,
  }: {
    document: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  }): Promise<void> => {
    const newsFeedConfiguration = NewsFeedHelper.getNewsFeedConfiguration(
      serviceDefinitionIdentifier,
      document
    );
    if (!newsFeedConfiguration) {
      return;
    }

    const { newsFeedType, platformIdentifier } = newsFeedConfiguration;

    const useCases = await useCaseDomain.loadUseCasesByDocumentId(document.id);
    const tags = useCases.map((useCase) => useCase.name);
    const newsFeedItem = await NewsFeedDomain.createResourceNewsFeedItem({
      document,
      serviceDefinitionIdentifier,
      type: newsFeedType,
      platformIdentifier,
      tags,
    });

    await provisionNewsFeedItemForAllSupportedPlatforms({
      newsFeedItemId: newsFeedItem.id,
      platformIdentifier,
    });
  },

  updateResourceNewsFeedItem: async ({
    document,
    serviceDefinitionIdentifier,
  }: {
    document: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  }): Promise<void> => {
    const newsFeedConfiguration = NewsFeedHelper.getNewsFeedConfiguration(
      serviceDefinitionIdentifier,
      document
    );
    if (!newsFeedConfiguration) {
      return;
    }

    const existingItem = await NewsFeedDomain.loadNewsFeedItemByDocumentId(
      document.id
    );
    if (!existingItem) {
      return;
    }

    const useCases = await useCaseDomain.loadUseCasesByDocumentId(document.id);
    const tags = useCases.map((useCase) => useCase.name);

    await NewsFeedDomain.updateNewsFeedItem(existingItem.id, {
      title: document.name ?? existingItem.title,
      tags,
    });

    await provisionNewsFeedItemForAllSupportedPlatforms({
      newsFeedItemId: existingItem.id,
      platformIdentifier: newsFeedConfiguration.platformIdentifier,
    });
  },

  upsertResourceNewsFeed: async ({
    documentBeforeUpdate,
    updatedDocument,
    serviceDefinitionIdentifier,
  }: {
    documentBeforeUpdate: Document;
    updatedDocument: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  }): Promise<void> => {
    if (
      !NewsFeedHelper.getNewsFeedConfiguration(
        serviceDefinitionIdentifier,
        updatedDocument
      )
    ) {
      return;
    }

    if (updatedDocument.status !== DocumentStatus.Published) {
      return;
    }

    const shouldCreateNewsFeedItem =
      documentBeforeUpdate.status !== DocumentStatus.Published;
    if (shouldCreateNewsFeedItem) {
      await NewsFeedApp.createResourceNewsFeedItem({
        document: updatedDocument,
        serviceDefinitionIdentifier,
      }).catch((error) =>
        logApp.error('Unable to create news feed item', {
          error,
          documentId: updatedDocument.id,
          source: 'update',
        })
      );
      return;
    }

    await NewsFeedApp.updateResourceNewsFeedItem({
      document: updatedDocument,
      serviceDefinitionIdentifier,
    }).catch((error) =>
      logApp.error('Unable to update news feed item', {
        error,
        documentId: updatedDocument.id,
        source: 'update',
      })
    );
  },

  deleteResourceNewsFeed: async ({
    documentId,
  }: {
    documentId: DocumentId;
  }): Promise<void> => {
    try {
      const existingItem =
        await NewsFeedDomain.loadNewsFeedItemByDocumentId(documentId);
      if (!existingItem) {
        return;
      }

      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: existingItem.id });
    } catch (error) {
      logApp.error('Unable to delete news feed item', { error, documentId });
    }
  },

  deleteNewsFeedItem: async ({
    newsFeedItemId,
  }: {
    newsFeedItemId: string;
  }): Promise<void> => {
    // Blog items are owned by the blogpost synchronization: only it can drop them
    const existingItemType = await NewsFeedDomain.loadNewsFeedItemTypeById(
      newsFeedItemId as NewsFeedItemId
    );
    if (existingItemType === NewsFeedItemType.BlogPost) {
      throw new Error(ErrorCode.CantDeleteBlogpostNewsFeedItem);
    }

    const newsFeedItem = await NewsFeedDomain.markNewsFeedItemAsDeleted(
      newsFeedItemId as NewsFeedItemId
    );

    // Every track: a platform may have changed release track since consuming the item
    if (newsFeedItem.type === NewsFeedItemType.GithubRelease) {
      await provisionGithubReleaseNewsFeedItem({
        newsFeedItemId: newsFeedItem.id,
        platformIdentifier: newsFeedItem.platform_identifier,
      });
      return;
    }

    const platformIdentifier = Object.values(newsFeedConfigurationMapping).find(
      (config) => config.newsFeedType === newsFeedItem.type
    )?.platformIdentifier;
    if (!platformIdentifier) {
      return;
    }

    await provisionNewsFeedItemForAllSupportedPlatforms({
      newsFeedItemId: newsFeedItem.id,
      platformIdentifier,
    });
  },

  cleanExpiredNewsFeedItems: async (): Promise<void> => {
    const rawValue = config.get('news_feed.cleanup_interval_value');
    const rawUnit = config.get('news_feed.cleanup_interval_unit');

    if (
      typeof rawValue !== 'number' ||
      !Number.isFinite(rawValue) ||
      rawValue <= 0
    ) {
      throw new Error(
        `Invalid config "news_feed.cleanup_interval_value": expected positive number, got ${typeof rawValue} (${rawValue})`
      );
    }
    if (
      typeof rawUnit !== 'string' ||
      !INTERVAL_UNITS.includes(rawUnit as IntervalUnit)
    ) {
      throw new Error(
        `Invalid config "news_feed.cleanup_interval_unit": expected one of ${INTERVAL_UNITS.join(', ')}, got ${rawUnit}`
      );
    }

    const cutoffDate = IntervalHelper.subtractInterval(
      new Date(),
      rawValue,
      rawUnit as IntervalUnit
    );

    const deletedCount =
      await NewsFeedDomain.deleteNewsFeedItemsOlderThan(cutoffDate);

    logApp.info('Cleaned expired news feed items', {
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
      intervalValue: rawValue,
      intervalUnit: rawUnit,
    });
  },
};
