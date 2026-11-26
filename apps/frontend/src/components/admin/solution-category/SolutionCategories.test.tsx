import SolutionCategories from '@/components/admin/solution-category/SolutionCategories';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  OrderingMode,
  SolutionCategoriesListQuery,
  SolutionCategoriesListQueryVariables,
  SolutionCategoryOrdering,
  useSolutionCategoriesListQuery,
} from '@graphql/generated';
import {
  mockSolutionCategory,
  mockSolutionCategoryConnection,
  mockSolutionCategoryEdge,
} from '@graphql/mocks';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  // Replaced in the vi.mock factory by a mock wrapping the real hook.
  useSolutionCategoriesListQuery: vi.fn(),
  listSolutionCategories:
    vi.fn<
      (
        variables: SolutionCategoriesListQueryVariables
      ) => Promise<SolutionCategoriesListQuery>
    >(),
}));

// The tests above go through the real hook; the list controls below swap in a
// query whose fetch is mocked to read the variables it is called with.
vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  // A reset brings a mock back to the implementation it was created with.
  mocks.useSolutionCategoriesListQuery = vi.fn(
    actual.useSolutionCategoriesListQuery
  );
  return mockGeneratedQueryHooks(importOriginal, {
    useSolutionCategoriesListQuery: mocks.useSolutionCategoriesListQuery,
  });
});

const CATEGORY_NAME = 'threat hunting';
const FORMATTED_CATEGORY_NAME = 'Threat Hunting';

const SOLUTION_CATEGORIES_RESPONSE: SolutionCategoriesListQuery = {
  solutionCategories: mockSolutionCategoryConnection({
    totalCount: 1,
    edges: [
      mockSolutionCategoryEdge({
        node: mockSolutionCategory({
          id: 'solution-category-1',
          name: CATEGORY_NAME,
          product: [FiligranProduct.Opencti],
        }),
      }),
    ],
  }),
};

// The list runs on a real QueryClient: only its fetch is mocked.
const useListQueryWithMockedFetch = (
  _client: unknown,
  variables: SolutionCategoriesListQueryVariables,
  options?: Omit<UseQueryOptions<SolutionCategoriesListQuery>, 'queryKey'>
) =>
  useQuery({
    ...options,
    queryKey: useSolutionCategoriesListQuery.getKey(variables),
    queryFn: () => mocks.listSolutionCategories(variables),
  });

const lastQueriedVariables = () =>
  mocks.listSolutionCategories.mock.lastCall?.[0];

const renderList = async () => {
  const rendered = testRender(<SolutionCategories />);
  await screen.findByText(FORMATTED_CATEGORY_NAME);
  return rendered;
};

describe('SolutionCategories', () => {
  it('should render solution categories from GraphQL query', async () => {
    const mockedSolutionCategoriesResponse: SolutionCategoriesListQuery = {
      solutionCategories: mockSolutionCategoryConnection({
        totalCount: 2,
        edges: [
          mockSolutionCategoryEdge({
            node: mockSolutionCategory({
              id: 'solution-category-1',
              name: 'threat hunting',
              product: [FiligranProduct.Opencti],
            }),
          }),
          mockSolutionCategoryEdge({
            node: mockSolutionCategory({
              id: 'solution-category-2',
              name: 'incident response',
              product: [FiligranProduct.Openaev],
            }),
          }),
        ],
      }),
    };

    mswServer.use(
      mockGraphqlQuery({
        queryName: 'SolutionCategoriesList',
        data: mockedSolutionCategoriesResponse,
      })
    );

    testRender(<SolutionCategories />);

    expect(await screen.findByText('Threat Hunting')).toBeInTheDocument();
    expect(await screen.findByText('Incident Response')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'SolutionCategory.Actions.Add' })
    ).toBeInTheDocument();
  });

  it('should open edit sheet when clicking a row', async () => {
    const mockedSolutionCategoriesResponse: SolutionCategoriesListQuery = {
      solutionCategories: mockSolutionCategoryConnection({
        totalCount: 1,
        edges: [
          mockSolutionCategoryEdge({
            node: mockSolutionCategory({
              id: 'solution-category-1',
              name: 'threat hunting',
              product: [FiligranProduct.Opencti],
            }),
          }),
        ],
      }),
    };

    mswServer.use(
      mockGraphqlQuery({
        queryName: 'SolutionCategoriesList',
        data: mockedSolutionCategoriesResponse,
      })
    );

    const { user } = testRender(<SolutionCategories />);

    await user.click(await screen.findByText('Threat Hunting'));

    expect(
      await screen.findByLabelText('SolutionCategory.Form.Name')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('threat hunting')).toBeInTheDocument();
  });

  describe('list controls', () => {
    beforeEach(() => {
      mocks.useSolutionCategoriesListQuery.mockImplementation(
        useListQueryWithMockedFetch
      );
      mocks.listSolutionCategories.mockResolvedValue(
        SOLUTION_CATEGORIES_RESPONSE
      );
    });

    // The sorting and the page size are stored in localStorage.
    afterEach(() => {
      localStorage.clear();
    });

    it('should query the categories in descending order when the admin sorts the name column', async () => {
      // Given
      const { user } = await renderList();

      // When
      await user.click(screen.getByText('SolutionCategory.ListPage.Name'));

      // Then
      await waitFor(() =>
        expect(lastQueriedVariables()).toMatchObject({
          orderBy: SolutionCategoryOrdering.Name,
          orderMode: OrderingMode.Desc,
        })
      );
    });

    it('should query only the categories of a product when the admin filters on it', async () => {
      // Given
      const { user } = await renderList();

      // When
      await user.click(
        screen.getByRole('combobox', {
          name: 'SolutionCategory.ListPage.Product',
        })
      );
      await user.click(
        await screen.findByRole('option', {
          name: FiligranProduct.Opencti.toUpperCase(),
        })
      );

      // Then
      await waitFor(() =>
        expect(lastQueriedVariables()).toMatchObject({
          product: FiligranProduct.Opencti,
        })
      );
    });

    it('should open the edit sheet again when the admin clicks the row after cancelling', async () => {
      // Given
      const { user } = await renderList();
      await user.click(screen.getByText(FORMATTED_CATEGORY_NAME));
      await user.click(
        await screen.findByRole('button', { name: 'Utils.Cancel' })
      );
      await waitFor(() =>
        expect(
          screen.queryByLabelText('SolutionCategory.Form.Name')
        ).not.toBeInTheDocument()
      );

      // When
      await user.click(screen.getByText(FORMATTED_CATEGORY_NAME));

      // Then
      expect(
        await screen.findByLabelText('SolutionCategory.Form.Name')
      ).toBeInTheDocument();
    });
  });
});
