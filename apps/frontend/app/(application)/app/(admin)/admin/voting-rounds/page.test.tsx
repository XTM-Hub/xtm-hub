import testRender from '@/utils/test/test-render';
import {
  PortalCapability,
  VotingRoundsListQuery,
  VotingRoundStatus,
} from '@graphql/generated';
import { mockVotingRound } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import Page from './page';

const mocks = vi.hoisted(() => ({
  useVotingRoundsListQuery: vi.fn(),
  useServiceInstancesListQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useVotingRoundsListQuery: mocks.useVotingRoundsListQuery,
    useServiceInstancesListQuery: mocks.useServiceInstancesListQuery,
  });
});

const ADMIN_USER = { capabilities: [{ name: PortalCapability.Bypass }] };
const STANDARD_USER = { capabilities: [] };
const ROUND_NAME = 'Feature vote #1';

const VOTING_ROUNDS_RESPONSE: VotingRoundsListQuery = {
  votingRounds: [
    mockVotingRound({
      id: 'round-1',
      name: ROUND_NAME,
      status: VotingRoundStatus.Open,
    }),
  ],
};

describe('Admin voting rounds page', () => {
  beforeEach(() => {
    mocks.useVotingRoundsListQuery.mockReturnValue({
      data: VOTING_ROUNDS_RESPONSE,
      isLoading: false,
    });
    mocks.useServiceInstancesListQuery.mockReturnValue({ data: undefined });
  });

  it('should show the voting rounds to an administrator', () => {
    // Given / When
    testRender(<Page />, { me: ADMIN_USER });

    // Then
    expect(
      screen.getByRole('heading', { name: 'MenuLinks.VotingRound' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: new RegExp(ROUND_NAME) })
    ).toBeInTheDocument();
  });

  it('should tell a standard user that they are not authorized instead of showing the voting rounds', () => {
    // Given / When
    testRender(<Page />, { me: STANDARD_USER });

    // Then
    expect(screen.getByText('Error.YouAreNotAuthorized')).toBeInTheDocument();
    expect(screen.queryByText(ROUND_NAME)).not.toBeInTheDocument();
  });
});
