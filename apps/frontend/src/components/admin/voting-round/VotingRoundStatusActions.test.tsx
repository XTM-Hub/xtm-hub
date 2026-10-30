import testRender from '@/utils/test/test-render';
import { VotingRoundStatus } from '@graphql/generated';
import { screen, within } from '@testing-library/react';

type MutationOutcome = 'success' | 'error' | 'pending';

interface MutationCallbacks {
  onSuccess?: () => unknown;
  onError?: (error: unknown) => unknown;
}

const mocks = vi.hoisted(() => ({
  state: { outcome: 'success' as MutationOutcome, error: '' },
  setStatus: vi.fn(),
}));

// Settles like react-query: the hook callbacks run once the request resolves.
vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@graphql/generated')>()),
  useVotingRoundSetStatusMutation: (
    _client: unknown,
    callbacks: MutationCallbacks = {}
  ) => ({
    mutate: (variables: unknown) => {
      mocks.setStatus(variables);
      if (mocks.state.outcome === 'pending') {
        return;
      }
      void Promise.resolve().then(() =>
        mocks.state.outcome === 'success'
          ? callbacks.onSuccess?.()
          : callbacks.onError?.(new Error(mocks.state.error))
      );
    },
    isPending: mocks.state.outcome === 'pending',
  }),
}));

const ROUND_ID = 'round-1';
const ROUND_NAME = 'Feature vote #1';
const SERVER_ERROR = 'VOTING_ROUND_WITHOUT_FEATURE';
const OPEN_LABEL = 'VotingRound.Actions.Open';
const CLOSE_LABEL = 'VotingRound.Actions.Close';

type User = ReturnType<typeof testRender>['user'];
type VotingRoundStatusActionsModule =
  typeof import('@/components/admin/voting-round/VotingRoundStatusActions');
type AppSnackbarsModule =
  typeof import('@/components/ui/snackbar/AppSnackbars');

let VotingRoundStatusActions: VotingRoundStatusActionsModule['VotingRoundStatusActions'];
let AppSnackbars: AppSnackbarsModule['AppSnackbars'];

const renderActions = (
  status: VotingRoundStatus,
  { hasFeatures = true }: { hasFeatures?: boolean } = {}
) =>
  testRender(
    <AppSnackbars>
      <VotingRoundStatusActions
        roundId={ROUND_ID}
        roundName={ROUND_NAME}
        status={status}
        hasFeatures={hasFeatures}
      />
    </AppSnackbars>
  );

const confirmAction = async (user: User, label: string) => {
  await user.click(screen.getByRole('button', { name: label }));
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: label }));
};

describe('VotingRoundStatusActions', () => {
  // The snackbar messages live at module level: a fresh module per test keeps
  // one test's messages out of the next.
  beforeEach(async () => {
    mocks.state.outcome = 'success';
    mocks.state.error = SERVER_ERROR;
    vi.resetModules();
    ({ VotingRoundStatusActions } =
      await import('@/components/admin/voting-round/VotingRoundStatusActions'));
    ({ AppSnackbars } = await import('@/components/ui/snackbar/AppSnackbars'));
  });

  it.each([
    {
      status: VotingRoundStatus.Draft,
      label: OPEN_LABEL,
      nextStatus: VotingRoundStatus.Open,
    },
    {
      status: VotingRoundStatus.Open,
      label: CLOSE_LABEL,
      nextStatus: VotingRoundStatus.Closed,
    },
    {
      status: VotingRoundStatus.Closed,
      label: OPEN_LABEL,
      nextStatus: VotingRoundStatus.Open,
    },
  ])(
    'should set a $status round to $nextStatus when the admin confirms $label',
    async ({ status, label, nextStatus }) => {
      // Given
      const { user } = renderActions(status);

      // When
      await confirmAction(user, label);

      // Then
      expect(mocks.setStatus).toHaveBeenCalledWith({
        id: ROUND_ID,
        status: nextStatus,
      });
    }
  );

  it('should not change the status when the admin dismisses the confirmation', async () => {
    // Given
    const { user } = renderActions(VotingRoundStatus.Open);
    await user.click(screen.getByRole('button', { name: CLOSE_LABEL }));
    const dialog = await screen.findByRole('alertdialog');

    // When
    await user.click(
      within(dialog).getByRole('button', { name: 'Utils.Cancel' })
    );

    // Then
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it('should confirm the status change once it succeeds', async () => {
    // Given
    const { user } = renderActions(VotingRoundStatus.Draft);

    // When
    await confirmAction(user, OPEN_LABEL);

    // Then
    expect(await screen.findByText('Utils.Success')).toBeInTheDocument();
  });

  it('should show the server error when the status change is rejected', async () => {
    // Given
    mocks.state.outcome = 'error';
    const { user } = renderActions(VotingRoundStatus.Draft);

    // When
    await confirmAction(user, OPEN_LABEL);

    // Then
    expect(
      await screen.findByText(`Error.Server.${SERVER_ERROR}`)
    ).toBeInTheDocument();
  });

  it.each([
    { status: VotingRoundStatus.Open, label: CLOSE_LABEL },
    { status: VotingRoundStatus.Draft, label: OPEN_LABEL },
  ])(
    'should disable $label while a status change is pending',
    ({ status, label }) => {
      // Given
      mocks.state.outcome = 'pending';

      // When
      renderActions(status);

      // Then
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
  );

  // Opening without an active feature is already refused in VotingRoundDetail.
  it('should leave a round without an active feature closable', () => {
    // Given / When
    renderActions(VotingRoundStatus.Open, { hasFeatures: false });

    // Then
    expect(screen.getByRole('button', { name: CLOSE_LABEL })).toBeEnabled();
  });
});
