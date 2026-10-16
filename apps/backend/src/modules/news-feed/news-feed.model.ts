import {
  NewsFeedItemType,
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
} from '../../__generated__/resolvers-types';

export interface NewsFeedConfiguration {
  newsFeedType: NewsFeedItemType;
  platformIdentifier: PlatformIdentifier;
}

export const newsFeedConfigurationMapping: Partial<
  Record<ServiceDefinitionIdentifier, NewsFeedConfiguration>
> = {
  [ServiceDefinitionIdentifier.OpenctiCustomDashboards]: {
    newsFeedType: NewsFeedItemType.ResourceCustomDashboard,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiPlaybooks]: {
    newsFeedType: NewsFeedItemType.ResourcePlaybook,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiCustomViews]: {
    newsFeedType: NewsFeedItemType.ResourceCustomView,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
  [ServiceDefinitionIdentifier.OpenctiIntegrations]: {
    newsFeedType: NewsFeedItemType.ResourceIntegration,
    platformIdentifier: PlatformIdentifier.Opencti,
  },
};

export const NEWS_FEED_UTM_MEDIUM = 'newsfeed';
export const NEWS_FEED_UTM_CAMPAIGN = 'hub_resources';
export const NEWS_FEED_UTM_CONTENT_FALLBACK = 'other';

export const newsFeedUtmContentMapping: Partial<
  Record<NewsFeedItemType, string>
> = {
  [NewsFeedItemType.ResourceCustomDashboard]: 'custom_dashboard',
  [NewsFeedItemType.ResourceCustomView]: 'custom_view',
  [NewsFeedItemType.ResourceIntegration]: 'integration',
  [NewsFeedItemType.ResourcePlaybook]: 'playbook',
};

// Public route that redirects to the external destination of an item. The relative url_path given to OpenCTI
// is built from this prefix, so the endpoint and the producer cannot diverge.
export const NEWS_FEED_REDIRECT_PATH_PREFIX = 'redirect/news-feed';
