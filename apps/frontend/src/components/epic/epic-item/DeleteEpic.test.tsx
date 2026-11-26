import { DeleteEpic } from '@/components/epic/epic-item/DeleteEpic';
import { buildEpicListVariables } from '@/components/epic/epic-list-query';
import { createQueryClient } from '@/lib/query-client';
import testRender from '@/utils/test/test-render';
import { EpicDeleteMutation, EpicsQuery } from '@graphql/generated';
import { mockEpic } from '@graphql/mocks';
import { epicKeys } from '@graphql/xtm-platform-roadmap/epic.keys';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state: {
    deleteOptions?: {
      onSuccess: (
        data: EpicDeleteMutation,
        variables: { id: string }
      ) => Promise<void> | void;
      onError: (error: unknown) => void;
    };
  } = {};
  return {
    deleteMutate: vi.fn(),
    showSnackbar: vi.fn(),
    ...state,
  };
});

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useEpicDeleteMutation: (
    _client: unknown,
    options: typeof mocks.deleteOptions
  ) => {
    mocks.deleteOptions = options;
    return { mutate: mocks.deleteMutate };
  },
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

const ROADMAP_EPIC = mockEpic({ id: 'epic-1', title: 'Roadmap' });
const OTHER_EPIC = mockEpic({ id: 'epic-2', title: 'Other' });
const SEARCH_TERM = 'road';
const EPIC_NOT_FOUND_ERROR = 'EPIC_NOT_FOUND';
const UNKNOWN_ERROR = 'UNKNOWN_ERROR';

const ALL_EPICS_VARIABLES = buildEpicListVariables();
const SEARCHED_EPICS_VARIABLES = buildEpicListVariables(SEARCH_TERM);

const buildEpicsQuery = (
  epics: (typeof ROADMAP_EPIC)[] = [ROADMAP_EPIC, OTHER_EPIC]
): EpicsQuery => ({
  epics: {
    totalCount: epics.length,
    edges: epics.map((epic) => ({ node: epic })),
  },
});

const renderWithCachedLists = () => {
  const queryClient = createQueryClient();
  queryClient.setQueryData(
    epicKeys.list(ALL_EPICS_VARIABLES),
    buildEpicsQuery()
  );
  queryClient.setQueryData(
    epicKeys.list(SEARCHED_EPICS_VARIABLES),
    buildEpicsQuery([ROADMAP_EPIC])
  );
  testRender(
    <DeleteEpic
      epic={ROADMAP_EPIC}
      open
      setOpen={vi.fn()}
    />,
    { queryClient }
  );
  return queryClient;
};

const succeedDeletion = () =>
  act(async () => {
    await mocks.deleteOptions?.onSuccess(
      { deleteEpic: { id: ROADMAP_EPIC.id } },
      { id: ROADMAP_EPIC.id }
    );
  });

describe('DeleteEpic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('close dialog when user clicks on cancel', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = testRender(
      <DeleteEpic
        epic={ROADMAP_EPIC}
        open={true}
        setOpen={setOpen}
      />
    );
    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

    // Then
    expect(setOpen).toHaveBeenCalledOnce();
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('commits deletion and closes the dialog when user confirms', async () => {
    // Given
    const setOpen = vi.fn();
    const { user } = testRender(
      <DeleteEpic
        epic={ROADMAP_EPIC}
        open={true}
        setOpen={setOpen}
      />
    );

    // When
    await user.click(screen.getByRole('button', { name: 'Utils.Delete' }));

    // Then
    expect(mocks.deleteMutate).toHaveBeenCalledExactlyOnceWith({
      id: ROADMAP_EPIC.id,
    });
    expect(setOpen).toHaveBeenCalledOnce();
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('should show the success toast when the deletion succeeds', async () => {
    // Given
    renderWithCachedLists();

    // When
    await succeedDeletion();

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
      severity: 'success',
      title: 'Utils.Success',
      description: 'Epic.EpicActions.EpicDeleted',
    });
  });

  it('should remove the epic from every cached list when the deletion succeeds', async () => {
    // Given
    const queryClient = renderWithCachedLists();

    // When
    await succeedDeletion();

    // Then
    expect(
      [ALL_EPICS_VARIABLES, SEARCHED_EPICS_VARIABLES].map((variables) =>
        queryClient.getQueryData(epicKeys.list(variables))
      )
    ).toEqual([buildEpicsQuery([OTHER_EPIC]), buildEpicsQuery([])]);
  });

  it('should invalidate every cached epic list when the deletion succeeds', async () => {
    // Given
    const queryClient = renderWithCachedLists();

    // When
    await succeedDeletion();

    // Then
    expect(
      [ALL_EPICS_VARIABLES, SEARCHED_EPICS_VARIABLES].map(
        (variables) =>
          queryClient.getQueryState(epicKeys.list(variables))?.isInvalidated
      )
    ).toEqual([true, true]);
  });

  it.each([
    {
      error: new Error(EPIC_NOT_FOUND_ERROR),
      expectedKey: EPIC_NOT_FOUND_ERROR,
      description: 'the server rejects it',
    },
    {
      error: EPIC_NOT_FOUND_ERROR,
      expectedKey: UNKNOWN_ERROR,
      description: 'the failure is not an Error',
    },
  ])(
    'should show the $expectedKey error when the deletion fails because $description',
    ({ error, expectedKey }) => {
      // Given
      renderWithCachedLists();

      // When
      act(() => {
        mocks.deleteOptions?.onError(error);
      });

      // Then
      expect(mocks.showSnackbar).toHaveBeenCalledExactlyOnceWith({
        severity: 'error',
        title: 'Utils.Error',
        description: <>{`Error.Server.${expectedKey}`}</>,
      });
    }
  );
});
