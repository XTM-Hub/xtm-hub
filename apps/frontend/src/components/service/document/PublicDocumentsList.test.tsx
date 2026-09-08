import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import PublicDocumentsList from '@/components/service/document/PublicDocumentsList';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  usePreloadedQuery: vi.fn(),
  useRefetchableFragment: vi.fn(),
  readInlineData: vi.fn(),
  useShareableResourceMapping: vi.fn(),
  useServiceListLocalStorage: vi.fn(),
  useScrollPosition: vi.fn(),
  refetch: vi.fn(),
  setSearch: vi.fn(),
  setPageSize: vi.fn(),
  setDisplayMode: vi.fn(),
  restore: vi.fn(),
}));

vi.mock('@/utils/shareable-resources/use-shareable-resource-mapping', () => ({
  useShareableResourceMapping: testState.useShareableResourceMapping,
}));

vi.mock('@/hooks/use-service-list-local-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-local-storage')
  >()),
  useServiceListLocalStorage: testState.useServiceListLocalStorage,
}));

vi.mock('@/hooks/use-scroll-position', () => ({
  default: testState.useScrollPosition,
}));

vi.mock('@/hooks/use-service-list-filters', () => ({
  useServiceListFilters: () => ({
    selectedFilters: [],
    addFilter: vi.fn(),
    removeFilter: vi.fn(),
  }),
}));

vi.mock('@/utils/debounce', () => ({
  debounceHandleInput:
    (callback: (value: string) => void) =>
    (event: { target: { value: string } }) =>
      callback(event.target.value),
}));

vi.mock('react-relay', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-relay')>();
  return {
    ...original,
    usePreloadedQuery: testState.usePreloadedQuery,
    useRefetchableFragment: testState.useRefetchableFragment,
    readInlineData: testState.readInlineData,
    useMutation: () => [vi.fn(), false],
  };
});

describe('PublicDocumentsList', () => {
  const serviceInstance = {
    id: 'service-1',
    slug: 'my-service',
  } as Partial<seoServiceInstanceFragment$data>;
  const queryRef = {} as PreloadedQuery<publicDocumentsQuery>;

  beforeEach(() => {
    testState.refetch.mockReset();
    testState.setSearch.mockReset();
    testState.setPageSize.mockReset();
    testState.setDisplayMode.mockReset();
    testState.restore.mockReset();

    testState.useShareableResourceMapping.mockReturnValue({
      localStorageKey: ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
      filters: {},
    });
    testState.useServiceListLocalStorage.mockReturnValue({
      search: 'initial-search',
      setSearch: testState.setSearch,
      pageSize: 10,
      setPageSize: testState.setPageSize,
      displayMode: ServiceListDisplayMode.List,
      setDisplayMode: testState.setDisplayMode,
      orderBy: DocumentOrdering.Name,
      orderMode: OrderingMode.Asc,
      setOrderBy: vi.fn(),
      setOrderMode: vi.fn(),
      selectedFilters: [],
      setSelectedFilters: vi.fn(),
      productVersions: {},
      openctiVersions: {},
    });
    testState.useScrollPosition.mockReturnValue({
      restore: testState.restore,
    });

    testState.usePreloadedQuery.mockReturnValue({});
    testState.useRefetchableFragment.mockReturnValue([
      {
        publicDocuments: {
          totalCount: 30,
          edges: [
            {
              node: {
                id: 'doc-1',
                slug: 'doc-1',
                name: 'Doc 1',
                type: 'opencti_custom_dashboard',
                short_description: 'description 1',
                use_cases: [],
              },
            },
            {
              node: {
                id: 'doc-2',
                slug: 'doc-2',
                name: 'Doc 2',
                type: 'opencti_custom_dashboard',
                short_description: 'description 2',
                use_cases: [],
              },
            },
          ],
        },
      },
      testState.refetch,
    ]);
    testState.readInlineData.mockImplementation(
      (_fragment: unknown, node: unknown) => node
    );
  });

  it('renders public documents list from relay data', () => {
    testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl="https://xtm.local"
        isDecouplingConnectorsEnabled={false}
      />
    );

    expect(testState.restore).toHaveBeenCalledOnce();
    expect(screen.getByText('Doc 1')).toBeInTheDocument();
    expect(screen.getByText('Doc 2')).toBeInTheDocument();
  });

  it('forwards search and display mode changes from header to local storage setters', async () => {
    const { user } = testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl="https://xtm.local"
        isDecouplingConnectorsEnabled={false}
      />
    );

    const searchInput = screen.getByPlaceholderText('GenericActions.Search');
    await user.clear(searchInput);
    await user.type(searchInput, 'search-updated');
    await user.click(
      screen.getByRole('button', { name: 'Service.List.ViewTab' })
    );

    expect(testState.setSearch).toHaveBeenCalledWith('search-updated');
    expect(testState.setDisplayMode).toHaveBeenCalledWith(
      ServiceListDisplayMode.Tab
    );
  });

  it('refetches with encoded cursor when going to next page', async () => {
    const { user } = testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl="https://xtm.local"
        isDecouplingConnectorsEnabled={false}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'GenericActions.Paginate.NextPage' })
    );

    expect(testState.refetch).toHaveBeenCalledWith({
      count: 10,
      cursor: btoa('10'),
    });
  });
});
