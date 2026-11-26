import { featureVotingKeys } from '@graphql/feature-voting/feature-voting.keys';
import { votingRoundKeys } from '@graphql/voting-round/voting-round.keys';
import type { QueryClient } from '@tanstack/react-query';

/**
 * A round, its features and its ranking are shown side by side on the detail
 * page, and the public page reads the same rounds. Any admin write therefore
 * invalidates all of them at once, otherwise the results block keeps showing
 * counts computed from features that no longer exist.
 */
export const invalidateVotingRoundQueries = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: votingRoundKeys.all() });
  void queryClient.invalidateQueries({ queryKey: votingRoundKeys.detailAll() });
  void queryClient.invalidateQueries({
    queryKey: votingRoundKeys.rankingAll(),
  });
  void queryClient.invalidateQueries({
    queryKey: featureVotingKeys.currentAll(),
  });
  void queryClient.invalidateQueries({
    queryKey: featureVotingKeys.calloutAll(),
  });
};
