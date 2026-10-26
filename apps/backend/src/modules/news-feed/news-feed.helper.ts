import {
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';
import Document from '../../model/kanel/public/Document';
import { RequiredPlatformVersions } from '../../utils/required-platform-version';
import { doesVersionSatisfy, isValidVersion } from '../../utils/versioning';
import { isConnectorDocument } from '../shareable-resource/opencti/integration/integration.model';
import {
  NEWS_FEED_REDIRECT_PATH_PREFIX,
  NEWS_FEED_UTM_CAMPAIGN_FALLBACK,
  NEWS_FEED_UTM_CONTENT_FALLBACK,
  NEWS_FEED_UTM_MEDIUM,
  NewsFeedConfiguration,
  newsFeedConfigurationMapping,
  newsFeedUtmCampaignMapping,
  newsFeedUtmContentMapping,
} from './news-feed.model';

// Only used to parse the relative url_path, never part of the returned value
const URL_PATH_PARSING_BASE = 'https://hub.invalid';

export const doesPlatformSupportNewsFeed = (
  identifier: PlatformIdentifier,
  version?: string | null
): boolean => {
  const requiredVersion = RequiredPlatformVersions.NewsFeedSupport[identifier];
  if (!requiredVersion) return true;
  if (!version || !isValidVersion(version)) return false;
  return doesVersionSatisfy({ givenVersion: version, requiredVersion });
};

export const NewsFeedHelper = {
  getNewsFeedConfiguration: (
    serviceDefinitionIdentifier: ServiceDefinitionIdentifier,
    document: Document
  ): NewsFeedConfiguration | undefined => {
    const newsFeedConfiguration =
      newsFeedConfigurationMapping[serviceDefinitionIdentifier];
    if (!newsFeedConfiguration) {
      return undefined;
    }

    if (isConnectorDocument(document)) {
      return undefined;
    }

    return newsFeedConfiguration;
  },

  // Relative url_path of the public route that redirects to the external destination of an item
  buildRedirectUrlPath: (newsFeedItemId: string): string =>
    `${NEWS_FEED_REDIRECT_PATH_PREFIX}/${encodeURIComponent(newsFeedItemId)}`,

  // Tags the Hub link so analytics can attribute visits coming from the platform news feed.
  // Overwrites existing utm_* values and keeps every other query parameter and the fragment.
  addUtmToUrlPath: ({
    urlPath,
    type,
    platformIdentifier,
  }: {
    urlPath: string;
    type: NewsFeedItemType;
    platformIdentifier: PlatformIdentifier;
  }): string => {
    const isAbsolutePath = urlPath.startsWith('/');
    const url = new URL(
      isAbsolutePath ? urlPath : `/${urlPath}`,
      URL_PATH_PARSING_BASE
    );
    url.searchParams.set('utm_source', platformIdentifier);
    url.searchParams.set('utm_medium', NEWS_FEED_UTM_MEDIUM);
    url.searchParams.set(
      'utm_campaign',
      newsFeedUtmCampaignMapping[type] ?? NEWS_FEED_UTM_CAMPAIGN_FALLBACK
    );
    url.searchParams.set(
      'utm_content',
      newsFeedUtmContentMapping[type] ?? NEWS_FEED_UTM_CONTENT_FALLBACK
    );

    const path = isAbsolutePath ? url.pathname : url.pathname.slice(1);
    return `${path}${url.search}${url.hash}`;
  },
};
