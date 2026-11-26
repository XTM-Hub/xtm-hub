import {
  useVotingRoundDetailQuery,
  useVotingRoundRankingQuery,
  useVotingRoundsListQuery,
  VotingRoundDetailQueryVariables,
  VotingRoundRankingQueryVariables,
} from '@graphql/generated';

export const votingRoundKeys = {
  all: useVotingRoundsListQuery.getRootKey,
  list: () => useVotingRoundsListQuery.getKey(),
  detailAll: useVotingRoundDetailQuery.getRootKey,
  detail: (variables: VotingRoundDetailQueryVariables) =>
    useVotingRoundDetailQuery.getKey(variables),
  rankingAll: useVotingRoundRankingQuery.getRootKey,
  ranking: (variables: VotingRoundRankingQueryVariables) =>
    useVotingRoundRankingQuery.getKey(variables),
};
