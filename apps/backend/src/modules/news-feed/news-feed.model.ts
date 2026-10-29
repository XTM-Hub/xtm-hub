import {
  FiligranProduct,
  NewsFeedItemMetadataKey,
  NewsFeedItemType,
  NewsFeedUtmContent,
  NewsFeedUtmMedium,
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
  [ServiceDefinitionIdentifier.OpenaevScenarios]: {
    newsFeedType: NewsFeedItemType.ResourceScenario,
    platformIdentifier: PlatformIdentifier.Openaev,
  },
};

// Products of the blog API whose posts become news feed items, with the platform that consumes them. MVP: OpenCTI only,
// the other products are ignored.
export const blogpostProductMapping: Partial<
  Record<FiligranProduct, PlatformIdentifier>
> = {
  [FiligranProduct.Opencti]: PlatformIdentifier.Opencti,
};

// Metadata keys that only serve the Hub (document lookup, external destination of a redirect): they are never
// returned to the consumers of the news feed, which only read url_path.
export const NEWS_FEED_INTERNAL_METADATA_KEYS: NewsFeedItemMetadataKey[] = [
  NewsFeedItemMetadataKey.DocumentId,
  NewsFeedItemMetadataKey.BlogPostSlug,
];

export const NEWS_FEED_UTM_MEDIUM = NewsFeedUtmMedium.Newsfeed;
export const NEWS_FEED_UTM_CAMPAIGN_FALLBACK = 'hub_resources';
export const NEWS_FEED_UTM_CAMPAIGN_BLOG_POST = 'blog_posts';
export const NEWS_FEED_UTM_CONTENT_FALLBACK = NewsFeedUtmContent.Other;

// The Hub resource types fall back to hub_resources: a blog post is not a Hub resource
export const newsFeedUtmCampaignMapping: Partial<
  Record<NewsFeedItemType, string>
> = {
  [NewsFeedItemType.BlogPost]: NEWS_FEED_UTM_CAMPAIGN_BLOG_POST,
};

// Typed with the GraphQL NewsFeedUtmContent enum: a value the schema does not know is a compile error, instead of a
// news_feed_redirect event that silently loses its utm_content
export const newsFeedUtmContentMapping: Partial<
  Record<NewsFeedItemType, NewsFeedUtmContent>
> = {
  [NewsFeedItemType.BlogPost]: NewsFeedUtmContent.BlogPosts,
  [NewsFeedItemType.ResourceCustomDashboard]:
    NewsFeedUtmContent.CustomDashboard,
  [NewsFeedItemType.ResourceCustomView]: NewsFeedUtmContent.CustomView,
  [NewsFeedItemType.ResourceIntegration]: NewsFeedUtmContent.Integration,
  [NewsFeedItemType.ResourcePlaybook]: NewsFeedUtmContent.Playbook,
  [NewsFeedItemType.ResourceScenario]: NewsFeedUtmContent.Scenario,
};

// Public route that redirects to the external destination of an item. The relative url_path given to OpenCTI
// is built from this prefix, so the endpoint and the producer cannot diverge.
export const NEWS_FEED_REDIRECT_PATH_PREFIX = 'redirect/news-feed';
