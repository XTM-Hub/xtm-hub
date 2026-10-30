import testRender from '@/utils/test/test-render';
import {
  PortalCapability,
  VotingRoundDetailQuery,
  VotingRoundStatus,
} from '@graphql/generated';
import { mockVotingRound } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { useParams } from 'next/navigation';
import Page from './page';

const mocks = vi.hoisted(() => ({
  useVotingRoundDetailQuery: vi.fn(),
  useVotingRoundRankingQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useVotingRoundDetailQuery: mocks.useVotingRoundDetailQuery,
    useVotingRoundRankingQuery: mocks.useVotingRoundRankingQuery,
  });
});

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const ROUND_ID = 'round-1';
const ROUND_NAME = 'Feature vote #1';

const VOTING_ROUND_DETAIL_RESPONSE: VotingRoundDetailQuery = {
  votingRound: mockVotingRound({
    id: ROUND_ID,
    name: ROUND_NAME,
    status: VotingRoundStatus.Draft,
    features: [],
  }),
};

describe('Admin voting round detail page', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ id: ROUND_ID });
    mocks.useVotingRoundDetailQuery.mockImplementation(
      (_client: unknown, variables: { id: string }) => ({
        data:
          variables.id === ROUND_ID ? VOTING_ROUND_DETAIL_RESPONSE : undefined,
        isLoading: false,
      })
    );
    mocks.useVotingRoundRankingQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it('should show the round of the URL to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: ROUND_NAME })
    ).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the round', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: ROUND_NAME })
    ).not.toBeInTheDocument();
  });
});
