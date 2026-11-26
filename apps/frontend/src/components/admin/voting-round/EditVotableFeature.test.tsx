import EditVotableFeature from '@/components/admin/voting-round/EditVotableFeature';
import { requestGraphqlWithUploads } from '@/lib/graphql-upload-client';
import { mockGraphqlMutation } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  VotableFeatureDeleteMutation,
  VotableFeatureUpdateDocument,
  VotableFeatureUpdateMutation,
} from '@graphql/generated';
import { mockVotableFeature } from '@graphql/mocks';
import { screen, waitFor, within } from '@testing-library/react';

vi.mock('@/lib/graphql-upload-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/graphql-upload-client')>()),
  requestGraphqlWithUploads: vi.fn(),
}));

vi.mock('@/components/admin/use-case/use-use-cases', () => ({
  useUseCases: () => [
    { id: 'use-case-1', name: 'Threat hunting', color: '#001122' },
  ],
}));

const GQL_OPERATION_VOTABLE_FEATURE_UPDATE = 'VotableFeatureUpdate';
const GQL_OPERATION_VOTABLE_FEATURE_DELETE = 'VotableFeatureDelete';

const feature = {
  id: 'feature-1',
  title: 'AI-powered report triage',
  short_description: 'Extract entities automatically.',
  description: 'Leverage AI to ingest unstructured threat reports.',
  product: FiligranProduct.Opencti,
  use_cases: [{ id: 'use-case-1', name: 'Threat hunting' }],
  illustration_document_id: null,
  position: 1,
  active: true,
};

const renderEdit = (onClose = vi.fn()) => ({
  onClose,
  ...testRender(
    <EditVotableFeature
      open
      onClose={onClose}
      feature={feature}
      serviceInstanceId="instance-1"
    />
  ),
});

describe('EditVotableFeature', () => {
  it('should prefill the form with the edited feature', () => {
    renderEdit();

    expect(screen.getByLabelText(/VotingRound.Feature.Title/i)).toHaveValue(
      'AI-powered report triage'
    );
  });

  it('should notify the parent once when Escape closes a clean sheet', async () => {
    // Given
    const { user, onClose } = renderEdit();

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close the sheet and notify the parent once the update succeeds', async () => {
    const response: VotableFeatureUpdateMutation = {
      updateVotableFeature: mockVotableFeature({ id: 'feature-1' }),
    };
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTABLE_FEATURE_UPDATE,
        data: response,
      })
    );
    const { user, onClose } = renderEdit();

    await user.type(screen.getByLabelText(/VotingRound.Feature.Title/i), ' v2');
    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  // The admin would otherwise lose the edits along with the sheet.
  it('should keep the sheet open when the update is rejected', async () => {
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTABLE_FEATURE_UPDATE,
        errors: [{ message: 'VOTABLE_FEATURE_PRODUCT_LOCKED' }],
      })
    );
    const { user, onClose } = renderEdit();

    await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

    expect(
      await screen.findByLabelText(/VotingRound.Feature.Title/i)
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should close the sheet once the feature is deleted', async () => {
    const response: VotableFeatureDeleteMutation = {
      deleteVotableFeature: mockVotableFeature({ id: 'feature-1' }),
    };
    mswServer.use(
      mockGraphqlMutation({
        queryName: GQL_OPERATION_VOTABLE_FEATURE_DELETE,
        data: response,
      })
    );
    const { user, onClose } = renderEdit();

    // The trigger and the confirmation share the same label, so the click has
    // to be scoped to the dialog the trigger just opened.
    await user.click(
      screen.getByRole('button', { name: 'MenuActions.Delete' })
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'MenuActions.Delete' })
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should send the uploaded illustration along with the updated feature', async () => {
    // Given
    const illustration = new File(['image'], 'illustration.png', {
      type: 'image/png',
    });
    const response: VotableFeatureUpdateMutation = {
      updateVotableFeature: mockVotableFeature({ id: feature.id }),
    };
    vi.mocked(requestGraphqlWithUploads).mockResolvedValue(response);
    const { user } = renderEdit();
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
        VotableFeatureUpdateDocument,
        expect.anything(),
        expect.anything()
      )
    );
    // toEqual finds any two files equal: the sent file is compared by identity.
    const [, , uploads] = vi.mocked(requestGraphqlWithUploads).mock.lastCall!;
    expect(uploads.document).toHaveLength(1);
    expect((uploads.document as File[])[0]).toBe(illustration);
  });

  it('should notify the parent when the admin cancels the edition', async () => {
    // Given
    const { user, onClose } = renderEdit();

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
