import config from 'config';
import {
  ConsumeProvisionedNewsFeedItemsResponse,
  NewsFeedItemMetadataKey,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { logApp } from '../../utils/app-logger.util';
import { ErrorCode } from '../../utils/error/error.code';
import {
  INTERVAL_UNITS,
  IntervalHelper,
  IntervalUnit,
} from '../common/interval.helper';
import { PlatformConfigurationDomain } from '../registration/platform-configuration/platform-configuration.domain';
import { RegistrationDomain } from '../registration/registration.domain';
import { useCaseDomain } from '../use-case/use-case.domain';
import { NewsFeedDomain } from './news-feed.domain';
import { doesPlatformSupportNewsFeed } from './news-feed.helper';
import { newsFeedConfigurationMapping } from './news-feed.model';

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

export const NewsFeedApp = {
  consumeProvisionedNewsFeedItems: async ({
    platformId,
    token,
  }: {
    platformId: string | null;
    token: string | null;
  }): Promise<ConsumeProvisionedNewsFeedItemsResponse> => {
    if (!platformId || !token) {
      throw new Error(ErrorCode.InvalidPlatformId);
    }

    const resolvedConfiguration =
      await PlatformConfigurationDomain.loadResolvedConfigurationByPlatformAndToken(
        {
          platform_id: platformId,
          token,
        }
      );
    if (!resolvedConfiguration) {
      throw new Error(ErrorCode.PlatformNotRegistered);
    }

    const rawItems =
      await NewsFeedDomain.loadAndConsumeProvisionedNewsFeedItems(platformId);

    const newsFeedItems = rawItems.map((item) => ({
      ...item,
      metadata: item.metadata
        .filter((m) => m.key !== NewsFeedItemMetadataKey.DocumentId)
        .map((m) => ({
          key: m.key as NewsFeedItemMetadataKey,
          value: m.value,
        })),
    }));

    return {
      news_feed_items: newsFeedItems,
      available_news_feed_types: NewsFeedDomain.loadAvailableNewsFeedTypes(
        resolvedConfiguration.platformIdentifier
      ),
    };
  },

  isNewsFeedConfigured: (
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier
  ): boolean => {
    return (
      newsFeedConfigurationMapping[serviceDefinitionIdentifier] !== undefined
    );
  },

  createResourceNewsFeedItem: async ({
    document,
    serviceDefinitionIdentifier,
  }: {
    document: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  }): Promise<void> => {
    const newsFeedConfiguration =
      newsFeedConfigurationMapping[serviceDefinitionIdentifier];
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
    const newsFeedConfiguration =
      newsFeedConfigurationMapping[serviceDefinitionIdentifier];
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
    documentBeforeUpdate?: Document;
    updatedDocument: Document;
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier;
  }): Promise<void> => {
    if (!NewsFeedApp.isNewsFeedConfigured(serviceDefinitionIdentifier)) {
      return;
    }

    if (!updatedDocument.active) {
      return;
    }

    const shouldCreateNewsFeedItem =
      !documentBeforeUpdate || !documentBeforeUpdate.active;
    if (shouldCreateNewsFeedItem) {
      await NewsFeedApp.createResourceNewsFeedItem({
        document: updatedDocument,
        serviceDefinitionIdentifier,
      }).catch((error) =>
        logApp.error('Unable to create news feed item', {
          error,
          documentId: updatedDocument.id,
          source: documentBeforeUpdate ? 'update' : 'creation',
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

  deleteNewsFeedItem: async ({
    newsFeedItemId,
  }: {
    newsFeedItemId: string;
  }): Promise<void> => {
    const newsFeedItem = await NewsFeedDomain.markNewsFeedItemAsDeleted(
      newsFeedItemId as NewsFeedItemId
    );

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
