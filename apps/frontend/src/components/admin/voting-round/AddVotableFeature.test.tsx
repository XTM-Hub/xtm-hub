import AddVotableFeature from '@/components/admin/voting-round/AddVotableFeature';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  VotableFeatureCreateDocument,
  VotableFeatureCreateMutation,
} from '@graphql/generated';
import { mockVotableFeature } from '@graphql/mocks';
import { screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/graphql-upload-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql-upload-client')>()),
  requestGraphqlWithUploads: vi.fn(),
}));

const GQL_OPERATION_VOTABLE_FEATURE_CREATE = 'VotableFeatureCreate';

type User = ReturnType<typeof testRender>['user'];

const openAndFillFeature = async (user: User) => {
  await user.click(
    screen.getByRole('button', { name: 'VotingRound.Feature.Actions.Add' })
  );
  await user.type(
    screen.getByLabelText(/VotingRound.Feature.Title/i),
    'AI-powered report triage'
  );
  await user.type(
    screen.getByLabelText(/VotingRound.Feature.ShortDescription/i),
    'Extract entities automatically.'
  );
  await user.type(
    screen.getByPlaceholderText('VotingRound.Feature.DescriptionPlaceholder'),
    'Leverage AI to ingest unstructured threat reports.'
  );
};

const fillForm = async (user: ReturnType<typeof testRender>['user']) => {
  await user.click(
    screen.getByRole('button', { name: 'VotingRound.Feature.Actions.Add' })
  );
  await user.type(
    screen.getByLabelText(/VotingRound.Feature.Title/i),
    'AI-powered report triage'
  );
  await user.type(
    screen.getByLabelText(/VotingRound.Feature.ShortDescription/i),
    'Extract entities automatically.'
  );
  await user.type(
    screen.getByPlaceholderText('VotingRound.Feature.DescriptionPlaceholder'),
    'Leverage AI to ingest unstructured threat reports.'
  );
  await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));
};

describe('AddVotableFeature', () => {
  it('should open the sheet from its trigger', async () => {
    const { user } = testRender(
      <AddVotableFeature
        roundId="round-1"
        serviceInstanceId="instance-1"
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Feature.Actions.Add' })
    );

    expect(
      screen.getByLabelText(/VotingRound.Feature.Title/i)
    ).toBeInTheDocument();
  });

  it('should close the sheet once the feature is created', async () => {
    const response: VotableFeatureCreateMutation = {
      createVotableFeature: mockVotableFeature({ id: 'feature-1' }),
    };
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTABLE_FEATURE_CREATE,
        data: response,
      })
    );

    const { user } = testRender(
      <AddVotableFeature
        roundId="round-1"
        serviceInstanceId="instance-1"
      />
    );
    await fillForm(user);

    await waitFor(() => {
      expect(
        screen.queryByLabelText(/VotingRound.Feature.Title/i)
      ).not.toBeInTheDocument();
    });
  });

  // Losing the sheet on failure would discard everything the admin typed, so
  // the form has to survive a rejected mutation.
  it('should keep the sheet open when the mutation fails', async () => {
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTABLE_FEATURE_CREATE,
        errors: [{ message: 'VOTABLE_FEATURE_MUTATION_ERROR' }],
      })
    );

    const { user } = testRender(
      <AddVotableFeature
        roundId="round-1"
        serviceInstanceId="instance-1"
      />
    );
    await fillForm(user);

    expect(
      await screen.findByLabelText(/VotingRound.Feature.Title/i)
    ).toBeInTheDocument();
  });

  it('should send the uploaded illustration along with the created feature', async () => {
    // Given
    const illustration = new File(['image'], 'illustration.png', {
      type: 'image/png',
    });
    const response: VotableFeatureCreateMutation = {
      createVotableFeature: mockVotableFeature({ id: 'feature-1' }),
    };
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue(response);
    const { user } = testRender(
      <AddVotableFeature
        roundId="round-1"
        serviceInstanceId="instance-1"
      />
    );
    await openAndFillFeature(user);
    await user.upload(
      screen.getByLabelText('VotingRound.Feature.Illustration', {
        selector: 'input',
      }),
      illustration
    );

    // When
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    // Then
    await waitFor(() =>
      expect(requestGraphqlWithUploads).toHaveBeenCalledWith(
        VotableFeatureCreateDocument,
        expect.anything(),
        expect.anything()
      )
    );
    // toEqual finds any two files equal: the sent file is compared by identity.
    const [, , uploads] = vi.mocked(requestGraphqlWithUploads).mock.lastCall!;
    expect(uploads.document).toHaveLength(1);
    expect((uploads.document as File[])[0]).toBe(illustration);
  });

  it('should close the sheet when the admin cancels the creation', async () => {
    // Given
    const { user } = testRender(
      <AddVotableFeature
        roundId="round-1"
        serviceInstanceId="instance-1"
      />
    );
    await user.click(
      screen.getByRole('button', { name: 'VotingRound.Feature.Actions.Add' })
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    await waitFor(() =>
      expect(
        screen.queryByLabelText(/VotingRound.Feature.Title/i)
      ).not.toBeInTheDocument()
    );
  });
});
