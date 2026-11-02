import { FeatureVotingList } from '@/components/feature-voting/FeatureVotingList';
import { getAuthenticatedGraphqlClient } from '@/lib/graphql-client';
import { getQueryClient } from '@/lib/query-client';
import { featureVotingKeys } from '@graphql/feature-voting/feature-voting.keys';
import { useCurrentVotingRoundQuery } from '@graphql/generated';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ComponentProps } from 'react';

type PrefetchedFeatureVotingListProps = ComponentProps<
  typeof FeatureVotingList
>;

/**
 * Server-renders the voting round: the query is prefetched with the visitor's
 * cookies (it carries `me` and `has_my_vote`) under the key the list reads, so
 * the list hydrates with data instead of a skeleton.
 */
export const PrefetchedFeatureVotingList = async ({
  serviceInstanceId,
  roadmapHref,
}: PrefetchedFeatureVotingListProps) => {
  const queryClient = getQueryClient();
  const variables = { service_instance_id: serviceInstanceId };

  // A failed prefetch is not dehydrated: the list fetches it again client-side.
  await queryClient.prefetchQuery({
    queryKey: featureVotingKeys.current(variables),
    queryFn: useCurrentVotingRoundQuery.fetcher(
      await getAuthenticatedGraphqlClient(),
      variables
    ),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FeatureVotingList
        serviceInstanceId={serviceInstanceId}
        roadmapHref={roadmapHref}
      />
    </HydrationBoundary>
  );
};
