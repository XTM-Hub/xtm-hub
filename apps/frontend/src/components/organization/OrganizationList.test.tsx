import HeaderOrganizationSwitcher from '@/components/menu/organization-switcher/HeaderOrganizationSwitcher';
import OrganizationList from '@/components/organization/OrganizationList';
import * as SnackbarStore from '@/components/ui/snackbar/snackbar-store';
import { toCursor } from '@/hooks/use-table-pagination';
import testRender from '@/utils/test/test-render';
import {
  type MeOrganizationsQuery,
  OrderingMode,
  type OrganizationItemFragment,
  OrganizationOrdering,
  type OrganizationsListQuery,
  type OrganizationsListQueryVariables,
} from '@graphql/generated';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORGANIZATION_ID = 'organization-filigran';
const ORGANIZATION_NAME = 'Filigran';
const ORGANIZATION_DOMAIN = 'filigran.io';
const NEW_ORGANIZATION_NAME = 'Acme Corporation';
const NEW_DOMAIN = 'acme.com';
const SEARCH_TERM = 'fili';
const SERVER_ERROR = 'ORGANIZATION_NOT_FOUND';
const PERSONAL_ORGANIZATION_ID = 'organization-personal';
const DEFAULT_PAGE_SIZE = 50;
const STORED_PAGE_SIZE = 10;
const SEVERAL_PAGES_COUNT = DEFAULT_PAGE_SIZE * 2;
// DataTable renders this many skeleton rows under its header row while loading.
const LOADING_ROW_COUNT = 30;

type MutationOutcome = 'success' | 'error' | 'pending';

interface MutationCallbacks {
  onSuccess?: (data: unknown, variables: unknown) => unknown;
  onError?: (error: unknown, variables: unknown) => unknown;
}

const mocks = vi.hoisted(() => {
  const state = {
    outcome: 'success' as MutationOutcome,
    error: new Error('ORGANIZATION_NOT_FOUND'),
  };
  const createOrganization = vi.fn();
  const editOrganization = vi.fn();
  const deleteOrganization = vi.fn();

  // Settles like react-query: the hook callbacks run once the request resolves.
  const buildMutationHook =
    (record: (variables: unknown) => void, buildResponse: () => unknown) =>
    (_client: unknown, callbacks: MutationCallbacks = {}) => ({
      mutate: (variables: unknown) => {
        record(variables);
        if (state.outcome === 'pending') {
          return;
        }
        void Promise.resolve().then(() =>
          state.outcome === 'success'
            ? callbacks.onSuccess?.(buildResponse(), variables)
            : callbacks.onError?.(state.error, variables)
        );
      },
      isPending: state.outcome === 'pending',
    });

  return {
    state,
    listOrganizations: vi.fn(),
    useOrganizationsListQuery: vi.fn(),
    fetchMeOrganizations: vi.fn(),
    useMeOrganizationsQuery: vi.fn(),
    createOrganization,
    editOrganization,
    deleteOrganization,
    buildMutationHook,
  };
});

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return {
    ...(await mockGeneratedQueryHooks(importOriginal, {
      useOrganizationsListQuery: mocks.useOrganizationsListQuery,
      useMeOrganizationsQuery: mocks.useMeOrganizationsQuery,
    })),
    // The responses are built on mutate, once the fixtures below exist.
    useOrganizationCreateMutation: mocks.buildMutationHook(
      mocks.createOrganization,
      () => ({ addOrganization: CREATED_ORGANIZATION })
    ),
    useOrganizationEditMutation: mocks.buildMutationHook(
      mocks.editOrganization,
      () => ({ editOrganization: EDITED_ORGANIZATION })
    ),
    useOrganizationDeleteMutation: mocks.buildMutationHook(
      mocks.deleteOrganization,
      () => ({ deleteOrganization: { id: ORGANIZATION_ID } })
    ),
  };
});

const makeOrganization = (
  overrides: Partial<OrganizationItemFragment> = {}
): OrganizationItemFragment => ({
  id: ORGANIZATION_ID,
  name: ORGANIZATION_NAME,
  domains: [ORGANIZATION_DOMAIN],
  personal_space: false,
  ...overrides,
});

const CREATED_ORGANIZATION = makeOrganization({
  id: 'organization-acme',
  name: NEW_ORGANIZATION_NAME,
  domains: [NEW_DOMAIN],
});
const EDITED_ORGANIZATION = makeOrganization({ name: NEW_ORGANIZATION_NAME });

const makeListResponse = (
  organizations: OrganizationItemFragment[],
  totalCount = organizations.length
): OrganizationsListQuery => ({
  organizations: {
    totalCount,
    edges: organizations.map((node) => ({ node })),
  },
});

// The list runs on a real QueryClient: only its fetch is mocked.
const useListQueryWithMockedFetch = (
  _client: unknown,
  variables: OrganizationsListQueryVariables,
  options?: Omit<UseQueryOptions<OrganizationsListQuery>, 'queryKey'>
) =>
  useQuery({
    ...options,
    queryKey: ['OrganizationsList', variables],
    queryFn: () => mocks.listOrganizations(variables),
  });

// The header switcher reads the user's organizations on the same QueryClient.
const useMeOrganizationsQueryWithMockedFetch = () =>
  useQuery({
    queryKey: ['MeOrganizations'],
    queryFn: mocks.fetchMeOrganizations,
  });

const ME_ORGANIZATIONS_RESPONSE: MeOrganizationsQuery = {
  me: {
    id: 'user-1',
    selected_organization_id: PERSONAL_ORGANIZATION_ID,
    organizations: [
      { id: PERSONAL_ORGANIZATION_ID, name: 'Personal', personal_space: true },
      { id: ORGANIZATION_ID, name: ORGANIZATION_NAME, personal_space: false },
    ],
  },
};

const mockListResponses = (...responses: Promise<OrganizationsListQuery>[]) =>
  responses.forEach((response) =>
    mocks.listOrganizations.mockReturnValueOnce(response)
  );

const lastQueriedVariables = (): OrganizationsListQueryVariables | undefined =>
  mocks.listOrganizations.mock.lastCall?.[0];

const getRowOf = (text: string): HTMLElement => {
  const row = screen.getByText(text).closest('tr');
  if (!row) {
    throw new Error(`No table row holds ${text}`);
  }
  return row;
};

const getSearchField = () =>
  screen.getByRole('searchbox', {
    name: 'OrganizationActions.SearchOrganizationWithEmail',
  });

const getNextPageButton = () =>
  screen.getByRole('button', { name: 'DesignSystem.DataTable.NextPage' });

type User = ReturnType<typeof testRender>['user'];

const renderList = async (
  options?: Parameters<typeof testRender>[1]
): Promise<ReturnType<typeof testRender>> => {
  const rendered = testRender(<OrganizationList />, options);
  await screen.findByText(ORGANIZATION_NAME);
  return rendered;
};

const openRowAction = async (user: User, action: string) => {
  await user.click(screen.getByRole('button', { name: 'Utils.OpenMenu' }));
  await user.click(await screen.findByRole('menuitem', { name: action }));
};

const typeOrganizationName = async (user: User, name: string) => {
  const nameInput = screen.getByLabelText('OrganizationForm.Name');
  await user.clear(nameInput);
  await user.type(nameInput, name);
};

const fillCreationForm = async (user: User) => {
  await user.click(
    screen.getByRole('button', { name: 'OrganizationForm.CreateOrganization' })
  );
  await typeOrganizationName(user, NEW_ORGANIZATION_NAME);
  await user.type(
    screen.getByRole('combobox', { name: 'OrganizationForm.Domains' }),
    `${NEW_DOMAIN},`
  );
};

const createOrganization = async (user: User) => {
  await fillCreationForm(user);
  await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));
};

const editOrganization = async (user: User) => {
  await openRowAction(user, 'Utils.Update');
  await typeOrganizationName(user, NEW_ORGANIZATION_NAME);
  await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));
};

const openDeleteDialog = async (user: User) => {
  await openRowAction(user, 'Utils.Delete');
  return screen.findByRole('alertdialog', {
    name: 'OrganizationForm.DeleteOrganization',
  });
};

const getDeleteConfirmButton = (dialog: HTMLElement) =>
  within(dialog).getByRole('button', { name: 'Utils.Delete' });

const deleteOrganization = async (user: User) => {
  const dialog = await openDeleteDialog(user);
  await user.click(getDeleteConfirmButton(dialog));
};

const renderListWithHeaderSwitcher = async (): Promise<
  ReturnType<typeof testRender>
> => {
  const rendered = testRender(
    <>
      <HeaderOrganizationSwitcher />
      <OrganizationList />
    </>
  );
  await screen.findByText(ORGANIZATION_NAME);
  await screen.findByText('OrganizationSwitcher.PersonalSpace');
  return rendered;
};

const MUTATION_CASES = [
  {
    action: 'creation',
    perform: createOrganization,
    successDescription: 'OrganizationActions.OrganizationCreated',
  },
  {
    action: 'edition',
    perform: editOrganization,
    successDescription: 'OrganizationActions.OrganizationUpdated',
  },
  {
    action: 'deletion',
    perform: deleteOrganization,
    successDescription: 'OrganizationActions.OrganizationDeleted',
  },
];

describe('OrganizationList', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.state.outcome = 'success';
    mocks.state.error = new Error(SERVER_ERROR);
    mocks.useOrganizationsListQuery.mockImplementation(
      useListQueryWithMockedFetch
    );
    mocks.listOrganizations.mockResolvedValue(
      makeListResponse([makeOrganization()])
    );
    mocks.useMeOrganizationsQuery.mockImplementation(
      useMeOrganizationsQueryWithMockedFetch
    );
    mocks.fetchMeOrganizations.mockResolvedValue(ME_ORGANIZATIONS_RESPONSE);
    vi.spyOn(SnackbarStore, 'showSnackbar').mockImplementation(() => undefined);
  });

  describe('list', () => {
    it('should display the name and the domains of each organization', async () => {
      // Given / When
      await renderList();

      // Then
      expect(getRowOf(ORGANIZATION_NAME)).toHaveTextContent(
        ORGANIZATION_DOMAIN
      );
    });

    it('should show skeleton rows when the first page is loading', () => {
      // Given
      mockListResponses(new Promise(() => undefined));

      // When
      testRender(<OrganizationList />);

      // Then
      expect(screen.getAllByRole('row')).toHaveLength(LOADING_ROW_COUNT + 1);
    });

    it('should show the load error above the table and keep the toolbar when the organizations cannot be loaded', async () => {
      // Given
      mocks.listOrganizations.mockRejectedValue(new Error(SERVER_ERROR));

      // When
      testRender(<OrganizationList />);

      // Then
      expect(
        await screen.findByText('OrganizationActions.LoadOrganizationsError')
      ).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(getSearchField()).toBeInTheDocument();
    });

    it('should query the first page with the page size and ordering stored in localStorage', async () => {
      // Given
      localStorage.setItem(
        'countOrganizationList',
        JSON.stringify(STORED_PAGE_SIZE)
      );
      localStorage.setItem(
        'orderModeOrganizationList',
        JSON.stringify(OrderingMode.Desc)
      );

      // When
      await renderList();

      // Then
      expect(lastQueriedVariables()).toEqual({
        count: STORED_PAGE_SIZE,
        cursor: toCursor(STORED_PAGE_SIZE, 0),
        orderBy: OrganizationOrdering.Name,
        orderMode: OrderingMode.Desc,
        searchTerm: '',
      });
    });

    it('should query the next page when the user goes to the next page', async () => {
      // Given
      mocks.listOrganizations.mockResolvedValue(
        makeListResponse([makeOrganization()], SEVERAL_PAGES_COUNT)
      );
      const { user } = await renderList();

      // When
      await user.click(getNextPageButton());

      // Then
      expect(lastQueriedVariables()).toMatchObject({
        count: DEFAULT_PAGE_SIZE,
        cursor: toCursor(DEFAULT_PAGE_SIZE, 1),
      });
    });

    it('should replace the previous page rows with skeletons when the next page is loading', async () => {
      // Given
      mockListResponses(
        Promise.resolve(
          makeListResponse([makeOrganization()], SEVERAL_PAGES_COUNT)
        ),
        new Promise(() => undefined)
      );
      const { user } = await renderList();

      // When
      await user.click(getNextPageButton());

      // Then
      await waitFor(() =>
        expect(screen.getAllByRole('row')).toHaveLength(LOADING_ROW_COUNT + 1)
      );
    });

    it('should query the searched organizations from the first page when the user searches', async () => {
      // Given
      mocks.listOrganizations.mockResolvedValue(
        makeListResponse([makeOrganization()], SEVERAL_PAGES_COUNT)
      );
      const { user } = await renderList();
      await user.click(getNextPageButton());

      // When
      fireEvent.change(getSearchField(), { target: { value: SEARCH_TERM } });

      // Then
      await waitFor(() =>
        expect(lastQueriedVariables()).toMatchObject({
          searchTerm: SEARCH_TERM,
          cursor: toCursor(DEFAULT_PAGE_SIZE, 0),
        })
      );
    });

    it('should keep the search term when the user goes to the next page', async () => {
      // Given
      mocks.listOrganizations.mockResolvedValue(
        makeListResponse([makeOrganization()], SEVERAL_PAGES_COUNT)
      );
      const { user } = await renderList();
      fireEvent.change(getSearchField(), { target: { value: SEARCH_TERM } });
      await waitFor(() =>
        expect(lastQueriedVariables()).toMatchObject({
          searchTerm: SEARCH_TERM,
        })
      );
      await screen.findByText(ORGANIZATION_NAME);

      // When
      await user.click(getNextPageButton());

      // Then
      expect(lastQueriedVariables()).toMatchObject({
        searchTerm: SEARCH_TERM,
        cursor: toCursor(DEFAULT_PAGE_SIZE, 1),
      });
    });

    it('should query the organizations in descending order and store it when the user sorts the name column', async () => {
      // Given
      await renderList();

      // When
      fireEvent.click(screen.getByText('OrganizationForm.Name'));

      // Then
      expect(lastQueriedVariables()).toMatchObject({
        orderBy: OrganizationOrdering.Name,
        orderMode: OrderingMode.Desc,
      });
      expect(localStorage.getItem('orderModeOrganizationList')).toBe(
        JSON.stringify(OrderingMode.Desc)
      );
    });
  });

  describe('mutations', () => {
    it.each(MUTATION_CASES)(
      'should query the list again when the $action succeeds',
      async ({ perform }) => {
        // Given
        const { user } = await renderList();

        // When
        await perform(user);

        // Then
        await waitFor(() =>
          expect(mocks.listOrganizations).toHaveBeenCalledTimes(2)
        );
      }
    );

    it.each([
      { action: 'edition', perform: editOrganization },
      { action: 'deletion', perform: deleteOrganization },
    ])(
      "should query the user's organizations again for the header switcher when the $action succeeds",
      async ({ perform }) => {
        // Given
        const { user } = await renderListWithHeaderSwitcher();

        // When
        await perform(user);

        // Then
        await waitFor(() =>
          expect(mocks.fetchMeOrganizations).toHaveBeenCalledTimes(2)
        );
      }
    );

    it.each(MUTATION_CASES)(
      'should show the success snackbar when the $action succeeds',
      async ({ perform, successDescription }) => {
        // Given
        const { user } = await renderList();

        // When
        await perform(user);

        // Then
        await waitFor(() =>
          expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
            severity: 'success',
            title: 'Utils.Success',
            description: successDescription,
          })
        );
      }
    );

    it.each(MUTATION_CASES)(
      'should not query the list again when the $action fails',
      async ({ perform }) => {
        // Given
        mocks.state.outcome = 'error';
        const { user } = await renderList();

        // When
        await perform(user);

        // Then
        await waitFor(() =>
          expect(SnackbarStore.showSnackbar).toHaveBeenCalled()
        );
        expect(mocks.listOrganizations).toHaveBeenCalledOnce();
      }
    );
  });

  describe('creation', () => {
    it('should send the typed name and domains when the user validates the form', async () => {
      // Given
      const { user } = await renderList();

      // When
      await createOrganization(user);

      // Then
      expect(mocks.createOrganization).toHaveBeenCalledWith({
        input: { name: NEW_ORGANIZATION_NAME, domains: [NEW_DOMAIN] },
      });
    });

    it('should tell the name is taken when the creation fails on an existing name', async () => {
      // Given
      mocks.state.outcome = 'error';
      mocks.state.error = new Error('ORGANIZATION_SAME_NAME_EXISTS');
      const { user } = await renderList();

      // When
      await createOrganization(user);

      // Then
      await waitFor(() =>
        expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
          severity: 'error',
          title: 'Utils.Error',
          description: <>{'OrganizationActions.ErrorNameAlreadyExists'}</>,
        })
      );
    });

    it('should disable Validate while the creation is in progress', async () => {
      // Given
      mocks.state.outcome = 'pending';
      const { user } = await renderList();

      // When
      await fillCreationForm(user);

      // Then
      expect(
        screen.getByRole('button', { name: 'Utils.Validate' })
      ).toBeDisabled();
    });
  });

  describe('edition', () => {
    it('should send the new name with the kept domains when the user validates the form', async () => {
      // Given
      const { user } = await renderList();

      // When
      await editOrganization(user);

      // Then
      expect(mocks.editOrganization).toHaveBeenCalledWith({
        id: ORGANIZATION_ID,
        input: { name: NEW_ORGANIZATION_NAME, domains: [ORGANIZATION_DOMAIN] },
      });
    });

    it('should close the edition sheet when the edition succeeds', async () => {
      // Given
      const { user } = await renderList();

      // When
      await editOrganization(user);

      // Then
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', {
            name: 'OrganizationForm.EditOrganization',
          })
        ).not.toBeInTheDocument()
      );
    });
  });

  describe('deletion', () => {
    it('should send the organization id when the user confirms', async () => {
      // Given
      const { user } = await renderList();

      // When
      await deleteOrganization(user);

      // Then
      expect(mocks.deleteOrganization).toHaveBeenCalledWith({
        id: ORGANIZATION_ID,
      });
    });

    it('should show the server error when the deletion fails', async () => {
      // Given
      mocks.state.outcome = 'error';
      const { user } = await renderList();

      // When
      await deleteOrganization(user);

      // Then
      await waitFor(() =>
        expect(SnackbarStore.showSnackbar).toHaveBeenCalledWith({
          severity: 'error',
          title: 'Utils.Error',
          description: <>{`Error.Server.${SERVER_ERROR}`}</>,
        })
      );
    });

    it('should go back to the previous page when the deletion empties the last page', async () => {
      // Given
      const lastPageCount = DEFAULT_PAGE_SIZE + 1;
      mockListResponses(
        Promise.resolve(makeListResponse([makeOrganization()], lastPageCount)),
        Promise.resolve(makeListResponse([makeOrganization()], lastPageCount)),
        Promise.resolve(makeListResponse([], DEFAULT_PAGE_SIZE))
      );
      const { user } = await renderList();
      await user.click(getNextPageButton());
      await screen.findByText(ORGANIZATION_NAME);

      // When
      await deleteOrganization(user);

      // Then
      await waitFor(() =>
        expect(lastQueriedVariables()).toMatchObject({
          cursor: toCursor(DEFAULT_PAGE_SIZE, 0),
        })
      );
      expect(mocks.listOrganizations).toHaveBeenCalledTimes(4);
    });

    it('should disable the confirmation while the deletion is in progress', async () => {
      // Given
      mocks.state.outcome = 'pending';
      const { user } = await renderList();

      // When
      const dialog = await openDeleteDialog(user);

      // Then
      expect(getDeleteConfirmButton(dialog)).toBeDisabled();
    });
  });
});
