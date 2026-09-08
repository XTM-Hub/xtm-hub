import {
  MutationDeleteNewsFeedItemArgs,
  NewsFeedItem,
  NewsFeedItemMetadataKey,
  QueryNewsFeedItemsArgs,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { PortalContext } from '../../model/portal-context';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import {
  extractPlatformId,
  extractPlatformToken,
} from '../security-management/token/platform-token.util';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';

const newsFeedResolver: Resolvers = {
  NewsFeedItemId: createRelayIdScalar<NewsFeedItemId>('NewsFeedItem'),
  NewsFeedItem: {
    metadata: async (parent: NewsFeedItem, _args, context: PortalContext) => {
      const metadata =
        await context.dataLoaders.newsFeed.metadataByNewsFeedItemIdLoader.load(
          parent.id as NewsFeedItemId
        );
      return metadata.map((m) => ({
        key: m.key as NewsFeedItemMetadataKey,
        value: m.value,
      }));
    },
  },
  Query: {
    newsFeedItems: async (_, args: QueryNewsFeedItemsArgs) => {
      try {
        return await NewsFeedDomain.loadPaginatedNewsFeedItems({
          first: args.first,
          after: args.after,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
  Mutation: {
    consumeProvisionedNewsFeedItems: async (_, __, context: PortalContext) => {
      try {
        const platformId = extractPlatformId(context.req);
        const token = extractPlatformToken(context.req);
        return await NewsFeedApp.consumeProvisionedNewsFeedItems({
          platformId,
          token,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
    deleteNewsFeedItem: async (_, { id }: MutationDeleteNewsFeedItemArgs) => {
      try {
        await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: id });
        return true;
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    },
  },
};

export default newsFeedResolver;
