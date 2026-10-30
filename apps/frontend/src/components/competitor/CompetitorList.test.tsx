import CompetitorList from '@/components/competitor/CompetitorList';
import testRender from '@/utils/test/test-render';
import { competitorListKeys } from '@graphql/competitor/competitor-list.keys';
import {
  CompetitorDeleteMutation,
  CompetitorOrdering,
  CompetitorRowFragment,
  CompetitorsListQuery,
  CompetitorsListQueryVariables,
  CompetitorTier,
  OrderingMode,
} from '@graphql/generated';
import { mockCompetitor } from '@graphql/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state: {
    deleteOptions?: {
      onSuccess: (data: CompetitorDeleteMutation) => Promise<void> | void;
      onError: (err: Error) => void;
    };
  } = {};
  return {
    listQuery: vi.fn(),
    deleteMutate: vi.fn(),
    showSnackbar: vi.fn(),
    competitors: [] as CompetitorRowFragment[],
    totalCount: 0,
    ...state,
  };
});

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  const useCompetitorsListQueryMock = (...args: unknown[]) => {
    mocks.listQuery(...args);
    return {
      data: {
        competitors: {
          totalCount: mocks.totalCount,
          edges: mocks.competitors.map((competitor) => ({ node: competitor })),
        },
      },
      isLoading: false,
    };
  };
  return {
    ...actual,
    useCompetitorsListQuery: Object.assign(useCompetitorsListQueryMock, {
      getKey: actual.useCompetitorsListQuery.getKey,
      getRootKey: actual.useCompetitorsListQuery.getRootKey,
    }),
    useCompetitorDeleteMutation: (
      _client: unknown,
      options: typeof mocks.deleteOptions
    ) => {
      mocks.deleteOptions = options;
      return { mutate: mocks.deleteMutate };
    },
  };
});

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

const ACME = mockCompetitor({
  id: 'competitor-1',
  name: 'Acme',
  tier: CompetitorTier.Tier1,
  domain: 'acme.com',
});

const GLOBEX = mockCompetitor({
  id: 'competitor-2',
  name: 'Globex',
  tier: CompetitorTier.Tier2,
  domain: 'globex.com',
});

const INITECH = mockCompetitor({
  id: 'competitor-3',
  name: 'Initech',
  tier: CompetitorTier.Tier3,
  domain: 'initech.com',
});

const DEFAULT_PAGE_SIZE = 50;
const NEW_PAGE_SIZE = 100;
const MULTI_PAGE_TOTAL_COUNT = 120;
const CACHED_TOTAL_COUNT = 3;
const NEXT_PAGE_LABEL = 'DesignSystem.DataTable.NextPage';
const DELETE_LABEL = 'CompetitorListPage.Delete';
const NAME_FIELD_LABEL = /CompetitorForm.Name/i;
const COMPETITOR_NOT_FOUND_ERROR = 'COMPETITOR_NOT_FOUND';

const FIRST_PAGE_VARIABLES: CompetitorsListQueryVariables = {
  count: DEFAULT_PAGE_SIZE,
  cursor: btoa('0'),
  orderBy: CompetitorOrdering.Tier,
  orderMode: OrderingMode.Asc,
};

const SECOND_PAGE_VARIABLES: CompetitorsListQueryVariables = {
  ...FIRST_PAGE_VARIABLES,
  cursor: btoa(String(DEFAULT_PAGE_SIZE)),
};

const FIRST_PAGE: CompetitorsListQuery = {
  competitors: {
    totalCount: CACHED_TOTAL_COUNT,
    edges: [{ node: ACME }, { node: GLOBEX }],
  },
};

const SECOND_PAGE: CompetitorsListQuery = {
  competitors: {
    totalCount: CACHED_TOTAL_COUNT,
    edges: [{ node: INITECH }],
  },
};

type ListQueryOptions = {
  throwOnError: (
    error: Error,
    query: { state: { data: CompetitorsListQuery | undefined } }
  ) => boolean;
};

const lastListVariables = () => mocks.listQuery.mock.lastCall?.[1];

const lastListOptions = () =>
  mocks.listQuery.mock.lastCall?.[2] as ListQueryOptions;

const renderWithCachedPages = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    competitorListKeys.list(FIRST_PAGE_VARIABLES),
    FIRST_PAGE
  );
  queryClient.setQueryData(
    competitorListKeys.list(SECOND_PAGE_VARIABLES),
    SECOND_PAGE
  );
  testRender(
    <QueryClientProvider client={queryClient}>
      <CompetitorList />
    </QueryClientProvider>
  );
  return queryClient;
};

const competitorRowName = (
  competitor: CompetitorRowFragment,
  tierLabel: string
) =>
  new RegExp(
    `${competitor.name}.*${tierLabel}.*${competitor.domain.replaceAll('.', '\\.')}`
  );

describe('CompetitorList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.competitors = [ACME, GLOBEX];
    mocks.totalCount = FIRST_PAGE.competitors.totalCount;
  });

  it('should render each competitor name, formatted tier and domain when the list is loaded', () => {
    // Given / When
    testRender(<CompetitorList />);

    // Then
    expect(
      screen.getByRole('row', {
        name: competitorRowName(ACME, 'Tier 1'),
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: competitorRowName(GLOBEX, 'Tier 2'),
      })
    ).toBeInTheDocument();
  });

  it('should query the first page ordered by tier ascending when no preference is stored', () => {
    // Given / When
    testRender(<CompetitorList />);

    // Then
    expect(lastListVariables()).toEqual(FIRST_PAGE_VARIABLES);
  });

  it('should query the next cursor when moving to the next page', async () => {
    // Given
    mocks.totalCount = MULTI_PAGE_TOTAL_COUNT;
    const { user } = testRender(<CompetitorList />);

    // When
    await user.click(screen.getByRole('button', { name: NEXT_PAGE_LABEL }));

    // Then
    await waitFor(() => {
      expect(lastListVariables()).toMatchObject({
        count: DEFAULT_PAGE_SIZE,
        cursor: btoa(String(DEFAULT_PAGE_SIZE)),
      });
    });
  });

  it('should query the new ordering on the current page when sorting by another column', async () => {
    // Given
    mocks.totalCount = MULTI_PAGE_TOTAL_COUNT;
    const { user } = testRender(<CompetitorList />);
    await user.click(screen.getByRole('button', { name: NEXT_PAGE_LABEL }));

    // When
    await user.click(screen.getByText('CompetitorListPage.Name'));

    // Then
    await waitFor(() => {
      expect(lastListVariables()).toEqual({
        count: DEFAULT_PAGE_SIZE,
        cursor: btoa(String(DEFAULT_PAGE_SIZE)),
        orderBy: CompetitorOrdering.Name,
        orderMode: OrderingMode.Asc,
      });
    });
  });

  it('should query the chosen page size when a rows-per-page value is picked', async () => {
    // Given
    const { user } = testRender(<CompetitorList />);
    await user.click(
      screen.getByRole('button', {
        name: 'DesignSystem.DataTable.ManageColumns',
      })
    );
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'DesignSystem.DataTable.RowsPerPage',
      })
    );

    // When
    // A pointer move off the sub-menu trigger closes the sub-menu in jsdom, so its item is picked with the keyboard.
    const pageSizeItem = await screen.findByRole('menuitem', {
      name: String(NEW_PAGE_SIZE),
    });
    act(() => pageSizeItem.focus());
    await user.keyboard('{Enter}');

    // Then
    await waitFor(() => {
      expect(lastListVariables()).toMatchObject({
        count: NEW_PAGE_SIZE,
        cursor: btoa('0'),
      });
    });
  });

  it('should query the default ordering when the stored sort is cleared', async () => {
    // Given
    window.localStorage.setItem(
      'orderByCompetitorList',
      JSON.stringify(CompetitorOrdering.Name)
    );
    window.localStorage.setItem(
      'orderModeCompetitorList',
      JSON.stringify(OrderingMode.Desc)
    );
    const { user } = testRender(<CompetitorList />);

    // When
    await user.click(screen.getByText('CompetitorListPage.Name'));

    // Then
    await waitFor(() => {
      expect(lastListVariables()).toMatchObject({
        orderBy: CompetitorOrdering.Tier,
        orderMode: OrderingMode.Asc,
      });
    });
  });

  it('should open an empty creation sheet when the add button is clicked', async () => {
    // Given
    const { user } = testRender(<CompetitorList />);

    // When
    await user.click(
      screen.getByRole('button', { name: 'CompetitorListPage.AddCompetitor' })
    );

    // Then
    expect(await screen.findByLabelText(NAME_FIELD_LABEL)).toHaveValue('');
  });

  it('should open the sheet prefilled with the competitor when its edit button is clicked', async () => {
    // Given
    const { user } = testRender(<CompetitorList />);

    // When
    await user.click(
      within(
        screen.getByRole('row', { name: new RegExp(ACME.name) })
      ).getByRole('button', { name: 'CompetitorListPage.Edit' })
    );

    // Then
    expect(await screen.findByLabelText(NAME_FIELD_LABEL)).toHaveValue(
      ACME.name
    );
  });

  it('should delete the competitor when the deletion is confirmed', async () => {
    // Given
    const { user } = testRender(<CompetitorList />);
    await user.click(
      within(
        screen.getByRole('row', { name: new RegExp(ACME.name) })
      ).getByRole('button', { name: DELETE_LABEL })
    );

    // When
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: DELETE_LABEL,
      })
    );

    // Then
    expect(mocks.deleteMutate).toHaveBeenCalledWith({ id: ACME.id });
  });

  it('should send the error to the admin error page when a load fails before any row is shown', () => {
    // Given
    testRender(<CompetitorList />);

    // When
    const shouldThrow = lastListOptions().throwOnError(new Error(), {
      state: { data: undefined },
    });

    // Then
    expect(shouldThrow).toBe(true);
  });

  it('should keep the rows on screen when a background refetch fails', () => {
    // Given
    testRender(<CompetitorList />);

    // When
    const shouldThrow = lastListOptions().throwOnError(new Error(), {
      state: { data: FIRST_PAGE },
    });

    // Then
    expect(shouldThrow).toBe(false);
  });

  it('should remove the competitor from the cached page that contains it when the deletion succeeds', async () => {
    // Given
    const queryClient = renderWithCachedPages();

    // When
    await act(async () => {
      await mocks.deleteOptions?.onSuccess({
        deleteCompetitor: { id: ACME.id },
      });
    });

    // Then
    expect(
      queryClient.getQueryData(competitorListKeys.list(FIRST_PAGE_VARIABLES))
    ).toEqual({
      competitors: {
        totalCount: CACHED_TOTAL_COUNT - 1,
        edges: [{ node: GLOBEX }],
      },
    });
  });

  it('should invalidate every cached page when the deletion succeeds', async () => {
    // Given
    const queryClient = renderWithCachedPages();

    // When
    await act(async () => {
      await mocks.deleteOptions?.onSuccess({
        deleteCompetitor: { id: ACME.id },
      });
    });

    // Then
    expect(
      [FIRST_PAGE_VARIABLES, SECOND_PAGE_VARIABLES].map(
        (variables) =>
          queryClient.getQueryState(competitorListKeys.list(variables))
            ?.isInvalidated
      )
    ).toEqual([true, true]);
  });

  it('should show the server error when the deletion fails', async () => {
    // Given
    testRender(<CompetitorList />);

    // When
    await act(async () => {
      await mocks.deleteOptions?.onError(new Error(COMPETITOR_NOT_FOUND_ERROR));
    });

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'error',
      title: 'Utils.Error',
      description: <>{`Error.Server.${COMPETITOR_NOT_FOUND_ERROR}`}</>,
    });
  });
});
