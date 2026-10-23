import ManageCompetitor from '@/components/competitor/ManageCompetitor';
import testRender from '@/utils/test/test-render';
import { competitorListKeys } from '@graphql/competitor/competitor-list.keys';
import {
  CompetitorAddMutation,
  CompetitorEditMutation,
  CompetitorOrdering,
  CompetitorRowFragment,
  CompetitorsListQuery,
  CompetitorsListQueryVariables,
  CompetitorTier,
  OrderingMode,
} from '@graphql/generated';
import { mockCompetitor } from '@graphql/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MutationOptions<TData> = {
  onSuccess: (data: TData) => Promise<void> | void;
  onError: (error: unknown) => void;
};

const LIST_QUERY_KEY = vi.hoisted(() => ['CompetitorsList']);

const mocks = vi.hoisted(() => ({
  addMutate: vi.fn(),
  editMutate: vi.fn(),
  addOptions: undefined as unknown,
  editOptions: undefined as unknown,
  showSnackbar: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCompetitorAddMutation: (_client: unknown, options: unknown) => {
    mocks.addOptions = options;
    return { mutate: mocks.addMutate };
  },
  useCompetitorEditMutation: (_client: unknown, options: unknown) => {
    mocks.editOptions = options;
    return { mutate: mocks.editMutate };
  },
}));

vi.mock('@graphql/competitor/competitor-list.keys', () => ({
  competitorListKeys: {
    all: () => LIST_QUERY_KEY,
    list: (variables: object) => [...LIST_QUERY_KEY, variables],
  },
}));

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

const UPDATED_NAME = 'Acme Updated';
const DOMAIN_ALREADY_EXISTS_ERROR = 'COMPETITOR_DOMAIN_ALREADY_EXISTS';
const PAGE_SIZE = 50;
const CACHED_TOTAL_COUNT = 2;

const DISPLAYED_PAGE_VARIABLES: CompetitorsListQueryVariables = {
  count: PAGE_SIZE,
  cursor: btoa('0'),
  orderBy: CompetitorOrdering.Tier,
  orderMode: OrderingMode.Asc,
};

const OTHER_PAGE_VARIABLES: CompetitorsListQueryVariables = {
  ...DISPLAYED_PAGE_VARIABLES,
  cursor: btoa(String(PAGE_SIZE)),
};

const DISPLAYED_PAGE: CompetitorsListQuery = {
  competitors: { totalCount: CACHED_TOTAL_COUNT, edges: [{ node: ACME }] },
};

const OTHER_PAGE: CompetitorsListQuery = {
  competitors: { totalCount: CACHED_TOTAL_COUNT, edges: [{ node: INITECH }] },
};

const renderWithCachedPages = (competitor?: CompetitorRowFragment) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    competitorListKeys.list(DISPLAYED_PAGE_VARIABLES),
    DISPLAYED_PAGE
  );
  queryClient.setQueryData(
    competitorListKeys.list(OTHER_PAGE_VARIABLES),
    OTHER_PAGE
  );
  testRender(
    <QueryClientProvider client={queryClient}>
      <ManageCompetitor
        competitor={competitor}
        listVariables={DISPLAYED_PAGE_VARIABLES}
        open
        setOpen={vi.fn()}
      />
    </QueryClientProvider>
  );
  return queryClient;
};

const succeedCreation = () =>
  act(async () => {
    await (
      mocks.addOptions as MutationOptions<CompetitorAddMutation>
    ).onSuccess({ createCompetitor: GLOBEX });
  });

describe('ManageCompetitor', () => {
  const setOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send the form values when a new competitor is submitted', async () => {
    // Given
    const { user } = testRender(
      <ManageCompetitor
        listVariables={DISPLAYED_PAGE_VARIABLES}
        open
        setOpen={setOpen}
      />
    );
    await user.type(screen.getByLabelText(/CompetitorForm.Name/i), GLOBEX.name);
    await user.type(
      screen.getByLabelText(/CompetitorForm.Domain/i),
      GLOBEX.domain
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'CompetitorForm.AddButton' })
    );

    // Then
    expect(mocks.addMutate).toHaveBeenCalledWith({
      input: {
        name: GLOBEX.name,
        domain: GLOBEX.domain,
        tier: CompetitorTier.Tier1,
      },
    });
  });

  it('should prepend the competitor to the displayed page when the creation succeeds', async () => {
    // Given
    const queryClient = renderWithCachedPages();

    // When
    await succeedCreation();

    // Then
    expect(
      queryClient.getQueryData(
        competitorListKeys.list(DISPLAYED_PAGE_VARIABLES)
      )
    ).toEqual({
      competitors: {
        totalCount: CACHED_TOTAL_COUNT + 1,
        edges: [{ node: GLOBEX }, { node: ACME }],
      },
    });
  });

  it('should leave the other cached pages unchanged when the creation succeeds', async () => {
    // Given
    const queryClient = renderWithCachedPages();

    // When
    await succeedCreation();

    // Then
    expect(
      queryClient.getQueryData(competitorListKeys.list(OTHER_PAGE_VARIABLES))
    ).toEqual(OTHER_PAGE);
  });

  it('should invalidate the other cached pages but not the displayed one when the creation succeeds', async () => {
    // Given
    const queryClient = renderWithCachedPages();

    // When
    await succeedCreation();

    // Then
    expect(
      [DISPLAYED_PAGE_VARIABLES, OTHER_PAGE_VARIABLES].map(
        (variables) =>
          queryClient.getQueryState(competitorListKeys.list(variables))
            ?.isInvalidated
      )
    ).toEqual([false, true]);
  });

  it('should send the competitor id with the edited values when an edit is submitted', async () => {
    // Given
    const { user } = testRender(
      <ManageCompetitor
        competitor={ACME}
        listVariables={DISPLAYED_PAGE_VARIABLES}
        open
        setOpen={setOpen}
      />
    );
    const nameInput = screen.getByLabelText(/CompetitorForm.Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, UPDATED_NAME);

    // When
    await user.click(
      screen.getByRole('button', { name: 'CompetitorForm.EditButton' })
    );

    // Then
    expect(mocks.editMutate).toHaveBeenCalledWith({
      input: {
        id: ACME.id,
        name: UPDATED_NAME,
        domain: ACME.domain,
        tier: ACME.tier,
      },
    });
  });

  it('should replace the competitor in the cached lists when the edit succeeds', async () => {
    // Given
    const updatedAcme = { ...ACME, name: UPDATED_NAME };
    const queryClient = renderWithCachedPages(ACME);

    // When
    await act(async () => {
      await (
        mocks.editOptions as MutationOptions<CompetitorEditMutation>
      ).onSuccess({ updateCompetitor: updatedAcme });
    });

    // Then
    expect(
      queryClient.getQueryData(
        competitorListKeys.list(DISPLAYED_PAGE_VARIABLES)
      )
    ).toEqual({
      competitors: {
        totalCount: CACHED_TOTAL_COUNT,
        edges: [{ node: updatedAcme }],
      },
    });
  });

  it.each([
    {
      operation: 'creation',
      competitor: undefined,
      succeed: () =>
        (mocks.addOptions as MutationOptions<CompetitorAddMutation>).onSuccess({
          createCompetitor: GLOBEX,
        }),
    },
    {
      operation: 'edition',
      competitor: ACME,
      succeed: () =>
        (
          mocks.editOptions as MutationOptions<CompetitorEditMutation>
        ).onSuccess({ updateCompetitor: ACME }),
    },
  ])(
    'should close the sheet when the $operation succeeds',
    async ({ competitor, succeed }) => {
      // Given
      testRender(
        <ManageCompetitor
          competitor={competitor}
          listVariables={DISPLAYED_PAGE_VARIABLES}
          open
          setOpen={setOpen}
        />
      );

      // When
      await act(async () => {
        await succeed();
      });

      // Then
      expect(setOpen).toHaveBeenCalledWith(false);
    }
  );

  it('should show the server error when the creation fails', () => {
    // Given
    testRender(
      <ManageCompetitor
        listVariables={DISPLAYED_PAGE_VARIABLES}
        open
        setOpen={setOpen}
      />
    );

    // When
    act(() => {
      (mocks.addOptions as MutationOptions<CompetitorAddMutation>).onError(
        new Error(DOMAIN_ALREADY_EXISTS_ERROR)
      );
    });

    // Then
    expect(mocks.showSnackbar).toHaveBeenCalledWith({
      severity: 'error',
      title: 'Utils.Error',
      description: <>{`Error.Server.${DOMAIN_ALREADY_EXISTS_ERROR}`}</>,
    });
  });

  it('should keep the sheet open when the creation fails', () => {
    // Given
    testRender(
      <ManageCompetitor
        listVariables={DISPLAYED_PAGE_VARIABLES}
        open
        setOpen={setOpen}
      />
    );

    // When
    act(() => {
      (mocks.addOptions as MutationOptions<CompetitorAddMutation>).onError(
        new Error(DOMAIN_ALREADY_EXISTS_ERROR)
      );
    });

    // Then
    expect(setOpen).not.toHaveBeenCalled();
  });
});
