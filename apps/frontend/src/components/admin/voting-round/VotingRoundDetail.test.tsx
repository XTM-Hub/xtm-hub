import { VotingRoundDetail } from '@/components/admin/voting-round/VotingRoundDetail';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  VotingRoundDetailQuery,
  VotingRoundRankingQuery,
  VotingRoundStatus,
} from '@graphql/generated';
import {
  mockUseCaseConnection,
  mockVotableFeature,
  mockVotingRound,
  mockVotingRoundResults,
} from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';

const GQL_OPERATION_VOTING_ROUND_DETAIL = 'VotingRoundDetail';
const GQL_OPERATION_VOTING_ROUND_RANKING = 'VotingRoundRanking';

const feature = mockVotableFeature({
  id: 'feature-1',
  title: 'AI-powered report triage',
  product: FiligranProduct.Opencti,
  use_cases: [{ id: 'use-case-1', name: 'Threat hunting', color: '#001122' }],
  position: 1,
  active: true,
});

const buildDetailResponse = (
  status: VotingRoundStatus
): VotingRoundDetailQuery => ({
  votingRound: mockVotingRound({
    id: 'round-1',
    name: 'Feature vote #1',
    status,
    features: [feature],
  }),
});

const rankingResponse: VotingRoundRankingQuery = {
  votingRoundResults: mockVotingRoundResults({
    total_voters: 3,
    round: mockVotingRound({ id: 'round-1', name: 'Feature vote #1' }),
    results: [{ __typename: 'VotableFeatureResult', feature, vote_count: 7 }],
  }),
};

const mockDetail = (status = VotingRoundStatus.Draft) =>
  mswServer.use(
    mockGraphqlQuery({
      queryName: GQL_OPERATION_VOTING_ROUND_DETAIL,
      data: buildDetailResponse(status),
    }),
    mockGraphqlQuery({
      queryName: GQL_OPERATION_VOTING_ROUND_RANKING,
      data: rankingResponse,
    })
  );

describe('VotingRoundDetail', () => {
  it('should render the round with its features', async () => {
    mockDetail();

    testRender(<VotingRoundDetail roundId="round-1" />);

    expect(
      await screen.findByRole('heading', { name: 'Feature vote #1' })
    ).toBeInTheDocument();
    expect(
      await screen.findByText('AI-powered report triage')
    ).toBeInTheDocument();
  });

  it('should render the ranking with the vote counts and the number of voters', async () => {
    mockDetail();

    testRender(<VotingRoundDetail roundId="round-1" />);

    expect(
      await screen.findByRole('heading', { name: 'VotingRound.Results.Title' })
    ).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(
      await screen.findByText('VotingRound.Results.TotalVoters')
    ).toBeInTheDocument();
  });

  it('should allow adding a feature while the round is not closed', async () => {
    mockDetail(VotingRoundStatus.Draft);

    testRender(<VotingRoundDetail roundId="round-1" />);

    expect(
      await screen.findByRole('button', {
        name: 'VotingRound.Feature.Actions.Add',
      })
    ).toBeInTheDocument();
  });

  it('should not allow adding a feature to a closed round', async () => {
    mockDetail(VotingRoundStatus.Closed);

    testRender(<VotingRoundDetail roundId="round-1" />);

    await screen.findByRole('heading', { name: 'Feature vote #1' });
    expect(
      screen.queryByRole('button', {
        name: 'VotingRound.Feature.Actions.Add',
      })
    ).not.toBeInTheDocument();
  });

  it('should group the results by product', async () => {
    const openaevFeature = mockVotableFeature({
      id: 'feature-3',
      title: 'Cloud attack simulations',
      product: FiligranProduct.Openaev,
    });
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_DETAIL,
        data: buildDetailResponse(VotingRoundStatus.Open),
      }),
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_RANKING,
        data: {
          votingRoundResults: mockVotingRoundResults({
            total_voters: 5,
            round: mockVotingRound({ id: 'round-1' }),
            results: [
              {
                __typename: 'VotableFeatureResult',
                feature: openaevFeature,
                vote_count: 9,
              },
              {
                __typename: 'VotableFeatureResult',
                feature,
                vote_count: 2,
              },
            ],
          }),
        },
      })
    );

    testRender(<VotingRoundDetail roundId="round-1" />);

    expect(
      await screen.findByRole('heading', { name: 'OpenCTI' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'OpenAEV' })
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Cloud attack simulations')
    ).toBeInTheDocument();
  });

  it('should still list a deactivated feature of an open round so it can be reactivated', async () => {
    const inactiveFeature = mockVotableFeature({
      id: 'feature-2',
      title: 'Deactivated feature',
      active: false,
    });
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_DETAIL,
        data: {
          votingRound: mockVotingRound({
            id: 'round-1',
            name: 'Feature vote #1',
            status: VotingRoundStatus.Open,
            features: [inactiveFeature],
          }),
        },
      }),
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_RANKING,
        data: rankingResponse,
      })
    );

    const { user } = testRender(<VotingRoundDetail roundId="round-1" />);

    expect(await screen.findByText('Deactivated feature')).toBeInTheDocument();
    expect(
      await screen.findByText('VotingRound.Feature.ActiveNo')
    ).toBeInTheDocument();

    await user.click(screen.getByText('Deactivated feature'));

    expect(
      await screen.findByLabelText('VotingRound.Feature.Active')
    ).not.toBeChecked();
  });

  it('should not allow opening a round whose only features are deactivated', async () => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_DETAIL,
        data: {
          votingRound: mockVotingRound({
            id: 'round-1',
            name: 'Feature vote #1',
            status: VotingRoundStatus.Draft,
            features: [mockVotableFeature({ id: 'feature-2', active: false })],
          }),
        },
      }),
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_RANKING,
        data: rankingResponse,
      })
    );

    testRender(<VotingRoundDetail roundId="round-1" />);

    expect(
      await screen.findByRole('button', { name: 'VotingRound.Actions.Open' })
    ).toBeDisabled();
  });

  it('should open the edit sheet when clicking a feature row', async () => {
    mockDetail();

    const { user } = testRender(<VotingRoundDetail roundId="round-1" />);

    await user.click(await screen.findByText('AI-powered report triage'));

    expect(
      await screen.findByLabelText(/VotingRound.Feature.Title/i)
    ).toBeInTheDocument();
  });

  it('should tell the admin that the round does not exist', async () => {
    // Given
    mswServer.use(
      mockGraphqlQuery({
        queryName: GQL_OPERATION_VOTING_ROUND_DETAIL,
        data: { votingRound: null },
      })
    );

    // When
    testRender(<VotingRoundDetail roundId="round-1" />);

    // Then
    expect(await screen.findByText('Utils.NotFound')).toBeInTheDocument();
  });

  it('should open the edit sheet again when the admin clicks the feature after cancelling', async () => {
    // Given
    mockDetail();
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'UseCasesList',
        data: { useCases: mockUseCaseConnection({ edges: [] }) },
      })
    );
    const { user } = testRender(<VotingRoundDetail roundId="round-1" />);
    const featureRow = await screen.findByRole('row', {
      name: /AI-powered report triage/,
    });
    await user.click(featureRow);
    await user.click(
      await screen.findByRole('button', { name: 'Utils.Cancel' })
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/VotingRound.Feature.Title/i)
      ).not.toBeInTheDocument()
    );

    // When
    await user.click(featureRow);

    // Then
    expect(
      await screen.findByLabelText(/VotingRound.Feature.Title/i)
    ).toBeInTheDocument();
  });
});
