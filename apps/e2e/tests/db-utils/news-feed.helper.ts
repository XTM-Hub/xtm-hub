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
