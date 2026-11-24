import {
  MutationResolvers,
  NewsFeedItem,
  NewsFeedItemMetadataKey,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { NewsFeedItemId } from '../../model/kanel/public/NewsFeedItem';
import { PortalContext } from '../../model/portal-context';
import { Guarded } from '../../security/guarded/guarded.decorator';
import { platformCallerGuard } from '../../security/guarded/guards/caller.guard';
import { bypassOnlyGuard } from '../../security/guarded/guards/portal.guard';
import { requirePlatformCaller } from '../../security/guarded/principal';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import { createRelayIdScalar } from '../../utils/scalar.util';
import { NewsFeedApp } from './news-feed.app';
import { NewsFeedDomain } from './news-feed.domain';

class NewsFeedQueries {
  @Guarded(bypassOnlyGuard())
  static readonly newsFeedItems: NonNullable<QueryResolvers['newsFeedItems']> =
    async (_, args) => {
      try {
        return await NewsFeedDomain.loadPaginatedNewsFeedItems({
          first: args.first,
          after: args.after,
        });
      } catch (error) {
        throw mapToGraphQLError(error);
      }
    };
}

class NewsFeedMutations {
  @Guarded(platformCallerGuard({ credential: 'registration' }))
  static readonly consumeProvisionedNewsFeedItems: NonNullable<
    MutationResolvers['consumeProvisionedNewsFeedItems']
  > = async (_, __, context) => {
    try {
      const platformCaller = requirePlatformCaller(context, 'registration');
      return await NewsFeedApp.consumeProvisionedNewsFeedItems({
        registration: platformCaller.registration,
      });
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };

  @Guarded(bypassOnlyGuard())
  static readonly deleteNewsFeedItem: NonNullable<
    MutationResolvers['deleteNewsFeedItem']
  > = async (_, { id }) => {
    try {
      await NewsFeedApp.deleteNewsFeedItem({ newsFeedItemId: id });
      return true;
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };
}

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
  Query: { ...NewsFeedQueries },
  Mutation: { ...NewsFeedMutations },
};

export default newsFeedResolver;
