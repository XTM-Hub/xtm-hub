import VotingRounds from '@/components/admin/voting-round/VotingRounds';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { VotingRoundsListQuery, VotingRoundStatus } from '@graphql/generated';
import { mockVotingRound } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

const serviceInstancesHandler = mockGraphqlQuery({
  queryName: 'ServiceInstancesList',
  data: {
    serviceInstances: {
      edges: [
        {
          node: {
            id: 'instance-1',
            name: 'XTM Platform Roadmap',
            service_definition: { identifier: 'xtm_platform_roadmap' },
          },
        },
      ],
    },
  },
});

const GQL_OPERATION_VOTING_ROUNDS_LIST = 'VotingRoundsList';
const ADD_ROUND_LABEL = 'VotingRound.Actions.Add';
const NEXT_PAGE_LABEL = 'DesignSystem.DataTable.NextPage';

const votingRoundsResponse: VotingRoundsListQuery = {
  votingRounds: [
    mockVotingRound({
      id: 'round-1',
      name: 'Feature vote #1',
      status: VotingRoundStatus.Open,
      feature_count: 3,
    }),
    mockVotingRound({
      id: 'round-2',
      name: 'Feature vote #2',
      status: VotingRoundStatus.Draft,
      feature_count: 0,
    }),
  ],
};

const mockRounds = () =>
  mswServer.use(
    serviceInstancesHandler,
    mockGraphqlQuery({
      queryName: GQL_OPERATION_VOTING_ROUNDS_LIST,
      data: votingRoundsResponse,
    })
  );

describe('VotingRounds', () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('should render one row per round with its status and feature count', async () => {
    mockRounds();

    testRender(<VotingRounds />);

    expect(await screen.findByText('Feature vote #1')).toBeInTheDocument();
    expect(await screen.findByText('Feature vote #2')).toBeInTheDocument();
    expect(
      await screen.findByText('VotingRound.Status.open')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('VotingRound.Status.draft')
    ).toBeInTheDocument();
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(await screen.findByText('0')).toBeInTheDocument();
  });

  it('should put the add voting round action after the pagination, above the table', async () => {
    // Given
    mockRounds();

    // When
    testRender(<VotingRounds />);
    await screen.findByText('Feature vote #1');

    // Then
    const addButton = screen.getByRole('button', { name: ADD_ROUND_LABEL });
    const nextPageButton = screen.getByRole('button', {
      name: NEXT_PAGE_LABEL,
    });
    expect(
      nextPageButton.compareDocumentPosition(addButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      addButton.compareDocumentPosition(screen.getByRole('table')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('should navigate to the round detail when clicking a row', async () => {
    mockRounds();

    const { user } = testRender(<VotingRounds />);

    await user.click(await screen.findByText('Feature vote #1'));

    expect(push).toHaveBeenCalledWith('/app/admin/voting-rounds/round-1');
  });

  // Opening and closing a round is only offered on the detail page, so the
  // action cannot be triggered by mistake while scanning the list.
  it('should not offer the open or close actions in the list', async () => {
    mockRounds();

    testRender(<VotingRounds />);

    await screen.findByText('Feature vote #1');
    expect(
      screen.queryByRole('button', { name: 'VotingRound.Actions.Open' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'VotingRound.Actions.Close' })
    ).not.toBeInTheDocument();
  });

  it('should open the edit sheet from the row actions menu', async () => {
    mockRounds();

    const { user } = testRender(<VotingRounds />);

    const [menuButton] = await screen.findAllByRole('button', {
      name: 'Utils.OpenMenu',
    });
    await user.click(menuButton!);
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'VotingRound.Actions.Edit',
      })
    );

    expect(
      await screen.findByLabelText(/VotingRound.Form.Name/i)
    ).toBeInTheDocument();
  });

  it('should open the edit sheet again when the admin edits the same round after cancelling', async () => {
    // Given
    mockRounds();
    const { user } = testRender(<VotingRounds />);
    const editFirstRound = async () => {
      const [menuButton] = await screen.findAllByRole('button', {
        name: 'Utils.OpenMenu',
      });
      await user.click(menuButton!);
      await user.click(
        await screen.findByRole('menuitem', {
          name: 'VotingRound.Actions.Edit',
        })
      );
    };
    await editFirstRound();
    await user.click(
      await screen.findByRole('button', { name: 'Utils.Cancel' })
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/VotingRound.Form.Name/i)
      ).not.toBeInTheDocument()
    );

    // When
    await editFirstRound();

    // Then
    expect(
      await screen.findByLabelText(/VotingRound.Form.Name/i)
    ).toBeInTheDocument();
  });
});
