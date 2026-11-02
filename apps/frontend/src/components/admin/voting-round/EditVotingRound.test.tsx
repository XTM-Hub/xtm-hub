import { VotingRoundFormModel } from '@/components/admin/voting-round/VotingRoundForm';
import testRender from '@/utils/test/test-render';
import { VotingRoundTheme } from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';

type MutationOutcome = 'success' | 'error';

interface MutationCallbacks {
  onSuccess?: () => unknown;
  onError?: (error: unknown) => unknown;
}

const mocks = vi.hoisted(() => {
  const state = { outcome: 'success' as MutationOutcome, error: '' };

  // Settles like react-query: the hook callbacks run once the request resolves.
  const buildMutationHook =
    (record: (variables: unknown) => void) =>
    (_client: unknown, callbacks: MutationCallbacks = {}) => ({
      mutate: (variables: unknown) => {
        record(variables);
        void Promise.resolve().then(() =>
          state.outcome === 'success'
            ? callbacks.onSuccess?.()
            : callbacks.onError?.(new Error(state.error))
        );
      },
    });

  return {
    state,
    updateVotingRound: vi.fn(),
    deleteVotingRound: vi.fn(),
    buildMutationHook,
  };
});

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useVotingRoundUpdateMutation: mocks.buildMutationHook(
    mocks.updateVotingRound
  ),
  useVotingRoundDeleteMutation: mocks.buildMutationHook(
    mocks.deleteVotingRound
  ),
}));

const ROUND_ID = 'round-1';
const ROUND_NAME = 'Feature vote #1';
const ROUND_DESCRIPTION = 'First round';
const NEW_DESCRIPTION = 'Second round';
const SERVER_ERROR = 'VOTING_ROUND_NOT_FOUND';
const DELETE_LABEL = 'MenuActions.Delete';

const votingRound: VotingRoundFormModel = {
  id: ROUND_ID,
  service_instance_id: 'instance-1',
  name: ROUND_NAME,
  description: ROUND_DESCRIPTION,
  theme: VotingRoundTheme.Thread,
};

type User = ReturnType<typeof testRender>['user'];
type EditVotingRoundModule =
  typeof import('@/components/admin/voting-round/EditVotingRound');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

let EditVotingRound: EditVotingRoundModule['default'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

const renderEdit = (onClose = vi.fn()) => ({
  onClose,
  ...testRender(
    <AppSnackbars>
      <EditVotingRound
        open
        onClose={onClose}
        votingRound={votingRound}
      />
    </AppSnackbars>
  ),
});

const saveDescription = async (user: User, description: string) => {
  const descriptionInput = screen.getByLabelText(
    /VotingRound.Form.Description/i
  );
  await user.clear(descriptionInput);
  await user.paste(description);
  await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));
};

const deleteRound = async (user: User) => {
  await user.click(screen.getByRole('button', { name: DELETE_LABEL }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: DELETE_LABEL }));
};

const ACTIONS = [
  {
    action: 'update',
    perform: (user: User) => saveDescription(user, NEW_DESCRIPTION),
  },
  { action: 'deletion', perform: deleteRound },
];

describe('EditVotingRound', () => {
  // The snackbar messages live at module level: a fresh module per test keeps
  // one test's messages out of the next.
  beforeEach(async () => {
    mocks.state.outcome = 'success';
    mocks.state.error = SERVER_ERROR;
    vi.resetModules();
    ({ default: EditVotingRound } =
      await import('@/components/admin/voting-round/EditVotingRound'));
    ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
  });

  it('should prefill the form with the edited round', () => {
    // Given / When
    renderEdit();

    // Then
    expect(screen.getByLabelText(/VotingRound.Form.Name/i)).toHaveValue(
      ROUND_NAME
    );
  });

  it.each([
    { description: NEW_DESCRIPTION, expected: NEW_DESCRIPTION },
    { description: '', expected: null },
  ])(
    'should save $expected as description when the admin enters "$description"',
    async ({ description, expected }) => {
      // Given
      const { user } = renderEdit();

      // When
      await saveDescription(user, description);

      // Then
      await waitFor(() =>
        expect(mocks.updateVotingRound).toHaveBeenCalledWith({
          id: ROUND_ID,
          input: {
            name: ROUND_NAME,
            description: expected,
            theme: VotingRoundTheme.Thread,
          },
        })
      );
    }
  );

  it('should delete the round once the admin confirms the deletion', async () => {
    // Given
    const { user } = renderEdit();

    // When
    await deleteRound(user);

    // Then
    expect(mocks.deleteVotingRound).toHaveBeenCalledWith({ id: ROUND_ID });
  });

  it.each(ACTIONS)(
    'should close the sheet and notify the parent once the $action succeeds',
    async ({ perform }) => {
      // Given
      const { user, onClose } = renderEdit();

      // When
      await perform(user);

      // Then
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    }
  );

  // The admin would otherwise lose the edits along with the sheet.
  it.each(ACTIONS)(
    'should show the server error and keep the sheet open when the $action is rejected',
    async ({ perform }) => {
      // Given
      mocks.state.outcome = 'error';
      const { user, onClose } = renderEdit();

      // When
      await perform(user);

      // Then
      expect(
        await screen.findByText(`Error.Server.${SERVER_ERROR}`)
      ).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  it('should notify the parent when the admin cancels the edition', async () => {
    // Given
    const { user, onClose } = renderEdit();

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
