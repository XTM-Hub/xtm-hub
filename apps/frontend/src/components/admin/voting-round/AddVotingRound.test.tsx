import AddVotingRound from '@/components/admin/voting-round/AddVotingRound';
import {
  mockGraphqlMutation,
  mockGraphqlQuery,
} from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { VotingRoundCreateMutation } from '@graphql/generated';
import { mockVotingRound } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';

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

const GQL_OPERATION_VOTING_ROUND_CREATE = 'VotingRoundCreate';

describe('AddVotingRound', () => {
  beforeEach(() => {
    mswServer.use(serviceInstancesHandler);
  });

  it('should open the sheet from its trigger', async () => {
    const { user } = testRender(<AddVotingRound copySources={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Actions.Add' })
    );

    expect(
      screen.getByRole('heading', { name: 'VotingRound.Actions.Add' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('VotingRound.Form.Name')).toBeInTheDocument();
  });

  it('should submit VotingRoundCreate and close the sheet on success', async () => {
    const response: VotingRoundCreateMutation = {
      createVotingRound: mockVotingRound({
        id: 'round-2',
        name: 'Feature vote #2',
      }),
    };
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTING_ROUND_CREATE,
        data: response,
      })
    );

    const { user } = testRender(<AddVotingRound copySources={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Actions.Add' })
    );
    await user.type(
      screen.getByLabelText(/VotingRound.Form.Name/i),
      'Feature vote #2'
    );
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/VotingRound.Form.Name/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should keep the sheet open when the mutation fails', async () => {
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTING_ROUND_CREATE,
        errors: [{ message: 'VOTING_ROUND_MUTATION_ERROR' }],
      })
    );

    const { user } = testRender(<AddVotingRound copySources={[]} />);

    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Actions.Add' })
    );
    await user.type(
      screen.getByLabelText(/VotingRound.Form.Name/i),
      'Feature vote #2'
    );
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    expect(
      await screen.findByLabelText(/VotingRound.Form.Name/i)
    ).toBeInTheDocument();
  });

  it('should offer to copy the features of an existing round', async () => {
    const { user } = testRender(
      <AddVotingRound
        copySources={[{ id: 'round-1', name: 'Feature vote #1' }]}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Actions.Add' })
    );

    expect(
      screen.getByLabelText('VotingRound.Form.CopyFeaturesFrom')
    ).toBeInTheDocument();
  });

  it('should close the sheet when the admin cancels the creation', async () => {
    // Given
    const { user } = testRender(<AddVotingRound copySources={[]} />);
    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Actions.Add' })
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/VotingRound.Form.Name/i)
      ).not.toBeInTheDocument()
    );
  });
});
