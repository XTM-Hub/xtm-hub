import { invalidateVotingRoundQueries } from '@/components/admin/voting-round/voting-round-query-invalidation';
import { featureVotingKeys } from '@graphql/feature-voting/feature-voting.keys';
import { votingRoundKeys } from '@graphql/voting-round/voting-round.keys';
import { QueryClient } from '@tanstack/react-query';

describe('invalidateVotingRoundQueries', () => {
  it.each`
    key                               | description
    ${votingRoundKeys.all()}          | ${'the admin round list'}
    ${votingRoundKeys.detailAll()}    | ${'the round detail'}
    ${votingRoundKeys.rankingAll()}   | ${'the results ranking shown next to the features'}
    ${featureVotingKeys.currentAll()} | ${'the public voting page'}
    ${featureVotingKeys.calloutAll()} | ${'the public callout'}
  `('should invalidate $description', ({ key }) => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    invalidateVotingRoundQueries(queryClient);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });
});
