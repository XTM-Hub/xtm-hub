import { v4 as uuidv4 } from 'uuid';
import { db } from './db-connection';

// The id as the Hub puts it in its urls: the Relay global id of the service instance
export const loadServiceInstanceGlobalIdByDefinitionIdentifier = async (
  identifier: string
): Promise<string> => {
  const serviceInstance = await db('ServiceInstance')
    .join(
      'ServiceDefinition',
      'ServiceDefinition.id',
      'ServiceInstance.service_definition_id'
    )
    .where('ServiceDefinition.identifier', identifier)
    .first('ServiceInstance.id');
  return btoa(`ServiceInstance:${serviceInstance.id}`);
};

export const addBlogPostNewsFeedItem = async (
  slug: string
): Promise<string> => {
  const id = uuidv4();
  await db('NewsFeedItem').insert({
    id,
    type: 'BLOG_POST',
    title: 'e2e blog post',
    platform_identifier: 'opencti',
  });
  await db('NewsFeedItemMetadata').insert({
    news_feed_item_id: id,
    key: 'blog_post_slug',
    value: slug,
  });
  return id;
};

// The metadata of the item is removed with it (ON DELETE CASCADE)
export const deleteNewsFeedItem = async (id: string): Promise<void> => {
  await db('NewsFeedItem').where({ id }).del();
};

export const OPENCTI_RESOURCE_NEWS_FEED_TYPES = {
  RESOURCE_CUSTOM_DASHBOARD: 'opencti_custom_dashboards',
  RESOURCE_CUSTOM_VIEW: 'opencti_custom_views',
} as const;
export type OpenctiResourceNewsFeedType =
  keyof typeof OPENCTI_RESOURCE_NEWS_FEED_TYPES;

// Gives the OpenCTI connected at `platformUrl` a news feed item to pull, as XTM Hub does when a resource is
// published. XTM Hub provisions a published item after the publication request returned, so an item that is not
// provisioned yet cannot be told from one that was pulled: here the item and its provisioning are inserted
// together, and isNewsFeedItemPulled is reliable.
export const addOpenctiNewsFeedItemToPull = async ({
  platformUrl,
  type,
  title,
}: {
  platformUrl: string;
  type: OpenctiResourceNewsFeedType;
  title: string;
}): Promise<string> => {
  const platform = await db('PlatformConfiguration')
    .where('platform_url', 'like', `${platformUrl}%`)
    .first('platform_id');
  if (!platform) {
    throw new Error(`No platform is connected to XTM Hub at ${platformUrl}`);
  }

  const id = uuidv4();
  await db.transaction(async (transaction) => {
    await transaction('NewsFeedItem').insert({
      id,
      type,
      title,
      platform_identifier: 'opencti',
    });
    await transaction('NewsFeedItemMetadata').insert({
      news_feed_item_id: id,
      key: 'url_path',
      value: `redirect/${OPENCTI_RESOURCE_NEWS_FEED_TYPES[type]}`,
    });
    await transaction('ProvisionedNewsFeedItem').insert({
      news_feed_item_id: id,
      platform_id: platform.platform_id,
    });
  });
  return id;
};

// XTM Hub deletes the provisioning of an item when the platform pulls it: OpenCTI then decides, user by user,
// who receives it.
export const isNewsFeedItemPulled = async (id: string): Promise<boolean> => {
  const pending = await db('ProvisionedNewsFeedItem')
    .where({ news_feed_item_id: id })
    .first();
  return !pending;
};
