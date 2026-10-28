import { VotingRoundResults } from '@/components/admin/voting-round/VotingRoundResults';
import testRender from '@/utils/test/test-render';
import { FiligranProduct, VotingRoundRankingQuery } from '@graphql/generated';
import {
  mockVotableFeature,
  mockVotingRound,
  mockVotingRoundResults,
} from '@graphql/mocks';
import { screen, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useVotingRoundRankingQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useVotingRoundRankingQuery: mocks.useVotingRoundRankingQuery,
  });
});

const ROUND_ID = 'round-1';
const RESULTS_TITLE = 'VotingRound.Results.Title';
const TOP_FEATURE_TITLE = 'AI-powered report triage';
const SECOND_FEATURE_TITLE = 'Graph exploration';
const TOP_FEATURE_VOTES = 9;
const SECOND_FEATURE_VOTES = 3;

const makeResult = (
  feature: ReturnType<typeof mockVotableFeature>,
  voteCount: number
) => ({
  __typename: 'VotableFeatureResult' as const,
  feature,
  vote_count: voteCount,
});

const makeRanking = (
  results: ReturnType<typeof makeResult>[]
): VotingRoundRankingQuery => ({
  votingRoundResults: mockVotingRoundResults({
    total_voters: 4,
    round: mockVotingRound({ id: ROUND_ID }),
    results,
  }),
});

const givenRanking = (data: VotingRoundRankingQuery | undefined) =>
  mocks.useVotingRoundRankingQuery.mockReturnValue({ data, isLoading: false });

describe('VotingRoundResults', () => {
  it('should render nothing when the round has no ranking', () => {
    // Given
    givenRanking({ votingRoundResults: null });

    // When
    testRender(<VotingRoundResults roundId={ROUND_ID} />);

    // Then
    expect(
      screen.queryByRole('heading', { name: RESULTS_TITLE })
    ).not.toBeInTheDocument();
  });

  it('should tell the admin that nobody voted yet when no feature has votes', () => {
    // Given
    givenRanking(makeRanking([]));

    // When
    testRender(<VotingRoundResults roundId={ROUND_ID} />);

    // Then
    expect(screen.getByText('VotingRound.Results.Empty')).toBeInTheDocument();
  });

  it('should rank the features of a product from the first position', () => {
    // Given
    givenRanking(
      makeRanking([
        makeResult(
          mockVotableFeature({
            id: 'feature-1',
            title: TOP_FEATURE_TITLE,
            product: FiligranProduct.Opencti,
            active: true,
          }),
          TOP_FEATURE_VOTES
        ),
        makeResult(
          mockVotableFeature({
            id: 'feature-2',
            title: SECOND_FEATURE_TITLE,
            product: FiligranProduct.Opencti,
            active: true,
          }),
          SECOND_FEATURE_VOTES
        ),
        makeResult(
          mockVotableFeature({
            id: 'feature-3',
            title: TOP_FEATURE_TITLE,
            product: FiligranProduct.Openaev,
            active: true,
          }),
          TOP_FEATURE_VOTES
        ),
        makeResult(
          mockVotableFeature({
            id: 'feature-4',
            title: SECOND_FEATURE_TITLE,
            product: FiligranProduct.Openaev,
            active: true,
          }),
          SECOND_FEATURE_VOTES
        ),
      ])
    );

    // When
    testRender(<VotingRoundResults roundId={ROUND_ID} />);

    // Then
    const expectedRanking = [
      `1${TOP_FEATURE_TITLE}${TOP_FEATURE_VOTES}`,
      `2${SECOND_FEATURE_TITLE}${SECOND_FEATURE_VOTES}`,
    ];
    expect(
      screen.getAllByRole('list').map((list) =>
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent)
      )
    ).toEqual([expectedRanking, expectedRanking]);
  });

  it('should flag a deactivated feature in the ranking', () => {
    // Given
    givenRanking(
      makeRanking([
        makeResult(
          mockVotableFeature({
            id: 'feature-1',
            title: TOP_FEATURE_TITLE,
            product: FiligranProduct.Opencti,
            active: false,
          }),
          2
        ),
      ])
    );

    // When
    testRender(<VotingRoundResults roundId={ROUND_ID} />);

    // Then
    expect(
      within(screen.getByRole('listitem')).getByText(
        'VotingRound.Results.InactiveFeature'
      )
    ).toBeInTheDocument();
  });
});
