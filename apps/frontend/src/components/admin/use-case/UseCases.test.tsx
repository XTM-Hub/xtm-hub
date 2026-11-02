import UseCases from '@/components/admin/use-case/UseCases';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  FiligranProduct,
  UseCasesListQuery,
  UseCasesListQueryVariables,
  useUseCasesListQuery,
} from '@graphql/generated';
import {
  mockUseCase,
  mockUseCaseConnection,
  mockUseCaseEdge,
} from '@graphql/mocks';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  // Replaced in the vi.mock factory by a mock wrapping the real hook.
  useUseCasesListQuery: vi.fn(),
  listUseCases:
    vi.fn<
      (variables: UseCasesListQueryVariables) => Promise<UseCasesListQuery>
    >(),
}));

// The tests above go through the real hook; the list controls below swap in a
// query whose fetch is mocked to read the variables it is called with.
vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  // A reset brings a mock back to the implementation it was created with.
  mocks.useUseCasesListQuery = vi.fn(actual.useUseCasesListQuery);
  return mockGeneratedQueryHooks(importOriginal, {
    useUseCasesListQuery: mocks.useUseCasesListQuery,
  });
});

const USE_CASE_NAME = 'threat hunting';

const USE_CASES_RESPONSE: UseCasesListQuery = {
  useCases: mockUseCaseConnection({
    totalCount: 1,
    edges: [
      mockUseCaseEdge({
        node: mockUseCase({ id: 'use-case-1', name: USE_CASE_NAME }),
      }),
    ],
  }),
};

const renderComponent = () => testRender(<UseCases />);

// The list runs on a real QueryClient: only its fetch is mocked.
const useListQueryWithMockedFetch = (
  _client: unknown,
  variables: UseCasesListQueryVariables,
  options?: Omit<UseQueryOptions<UseCasesListQuery>, 'queryKey'>
) =>
  useQuery({
    ...options,
    queryKey: useUseCasesListQuery.getKey(variables),
    queryFn: () => mocks.listUseCases(variables),
  });

const renderList = async () => {
  const rendered = renderComponent();
  await screen.findByText(USE_CASE_NAME);
  return rendered;
};

describe('UseCases', () => {
  it('should render use cases from GraphQL query', async () => {
    const mockedUseCasesResponse: UseCasesListQuery = {
      useCases: mockUseCaseConnection({
        totalCount: 2,
        edges: [
          mockUseCaseEdge({
            node: mockUseCase({
              id: 'use-case-1',
              name: 'threat hunting',
              color: '#11aa22',
            }),
          }),
          mockUseCaseEdge({
            node: mockUseCase({
              id: 'use-case-2',
              name: 'incident response',
              color: '#3344ff',
            }),
          }),
        ],
      }),
    };

    mswServer.use(
      mockGraphqlQuery({
        queryName: 'UseCasesList',
        data: mockedUseCasesResponse,
      })
    );

    renderComponent();

    expect(
      await screen.findByRole('row', { name: /threat hunting.*#11aa22/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('row', { name: /incident response.*#3344ff/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'UseCaseActions.AddUseCase' })
    ).toBeInTheDocument();
  });

  it('should show an error message when GraphQL request fails', async () => {
    mswServer.use(
      mockGraphqlQuery({
        queryName: 'UseCasesList',
        errors: [{ message: 'UNKNOWN_ERROR' }],
      })
    );

    renderComponent();

    expect(await screen.findByText('Utils.Error')).toBeInTheDocument();
  });

  describe('list controls', () => {
    beforeEach(() => {
      mocks.useUseCasesListQuery.mockImplementation(
        useListQueryWithMockedFetch
      );
      mocks.listUseCases.mockResolvedValue(USE_CASES_RESPONSE);
    });

    it('should query only the use cases of a product when the admin filters on it', async () => {
      // Given
      const { user } = await renderList();

      // When
      await user.click(
        screen.getByRole('combobox', { name: 'UseCaseListPage.Product' })
      );
      await user.click(
        await screen.findByRole('option', {
          name: FiligranProduct.Opencti.toUpperCase(),
        })
      );

      // Then
      await waitFor(() =>
        expect(mocks.listUseCases.mock.lastCall?.[0]).toMatchObject({
          product: FiligranProduct.Opencti,
        })
      );
    });

    it('should open the edit sheet again when the admin clicks the row after cancelling', async () => {
      // Given
      const { user } = await renderList();
      await user.click(screen.getByText(USE_CASE_NAME));
      await user.click(
        await screen.findByRole('button', { name: 'Utils.Cancel' })
      );
      await waitFor(() =>
        expect(
          screen.queryByLabelText('UseCaseForm.Name')
        ).not.toBeInTheDocument()
      );

      // When
      await user.click(screen.getByText(USE_CASE_NAME));

      // Then
      expect(
        await screen.findByLabelText('UseCaseForm.Name')
      ).toBeInTheDocument();
    });
  });
});
