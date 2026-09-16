import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import PublicDocumentsList from '@/components/service/document/PublicDocumentsList';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import testRender from '@/utils/test/test-render';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { screen } from '@testing-library/react';
import React from 'react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_URL = 'https://xtm.local';
const DOCUMENT_NAME_ONE = 'Doc 1';
const DOCUMENT_NAME_TWO = 'Doc 2';
const SERVICE_INSTANCE_ID = 'service-1';
const SERVICE_INSTANCE_SLUG = 'my-service';
const INTEGRATION_TYPE_VALUE = 'connector';
const FACET_COUNT = 4;
const EMPTY_FACETS = {
  documentFacets: {
    integration_type: [],
    license_type: [],
    manager_supported: [],
    verified: [],
    solution_category: [],
    use_case: [],
    entity_type: [],
  },
};

const testState = vi.hoisted(() => ({
  usePreloadedQuery: vi.fn(),
  useRefetchableFragment: vi.fn(),
  readInlineData: vi.fn(),
  useShareableResourceMapping: vi.fn(),
  useServiceListLocalStorage: vi.fn(),
  useLogicalFiltersFromStorage: vi.fn(),
  useDocumentFacetsQuery: vi.fn(),
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

vi.mock('@/hooks/use-logical-filters-from-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-logical-filters-from-storage')
  >()),
  useLogicalFiltersFromStorage: testState.useLogicalFiltersFromStorage,
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@graphql/generated')>();
  return {
    ...actual,
    useDocumentFacetsQuery: testState.useDocumentFacetsQuery,
  };
});

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

vi.mock('@/hooks/use-scroll-position', () => ({
  default: testState.useScrollPosition,
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
    id: SERVICE_INSTANCE_ID,
    slug: SERVICE_INSTANCE_SLUG,
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
    });
    testState.useLogicalFiltersFromStorage.mockReturnValue(undefined);
    testState.useDocumentFacetsQuery.mockReturnValue({ data: EMPTY_FACETS });
    testState.useScrollPosition.mockReturnValue({
      restore: testState.restore,
    });

    testState.usePreloadedQuery.mockReset();
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
                name: DOCUMENT_NAME_ONE,
                type: 'opencti_custom_dashboard',
                short_description: 'description 1',
                use_cases: [],
              },
            },
            {
              node: {
                id: 'doc-2',
                slug: 'doc-2',
                name: DOCUMENT_NAME_TWO,
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

  const mockFacetQuery = () => {
    testState.useDocumentFacetsQuery.mockReturnValue({
      data: {
        documentFacets: {
          integration_type: [
            { value: INTEGRATION_TYPE_VALUE, count: FACET_COUNT },
          ],
          license_type: [],
          manager_supported: [],
          verified: [],
          solution_category: [],
          use_case: [],
          entity_type: [],
        },
      },
    });
  };

  const mockEmptyFacetQuery = () => {
    testState.useDocumentFacetsQuery.mockReturnValue({ data: EMPTY_FACETS });
  };

  it('should render documents and facet filters when the facet query returns counts', () => {
    // Given
    testState.useShareableResourceMapping.mockReturnValue({
      localStorageKey: ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
      filters: {
        integrationType: {
          title: 'Service.OpenctiIntegrations.Filter.Type.Label',
          node: React.createElement(
            'label',
            undefined,
            React.createElement('input', {
              'aria-label': `Service.OpenctiIntegrations.Type.${INTEGRATION_TYPE_VALUE}`,
              type: 'checkbox',
            }),
            `Service.OpenctiIntegrations.Type.${INTEGRATION_TYPE_VALUE} (${FACET_COUNT})`
          ),
        },
      },
    });
    mockFacetQuery();
    testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl={BASE_URL}
      />
    );

    // When

    // Then
    expect(testState.restore).toHaveBeenCalledOnce();
    expect(screen.getByText(DOCUMENT_NAME_ONE)).toBeInTheDocument();
    expect(screen.getByText(DOCUMENT_NAME_TWO)).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Service.OpenctiIntegrations.Filter.Type.Label',
      })
    ).toBeInTheDocument();
  });

  it('should not pass any facet counts to the filters mapping before the facet query has resolved', () => {
    // Given
    testState.useDocumentFacetsQuery.mockReturnValue({ data: undefined });

    // When
    testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl={BASE_URL}
      />
    );

    // Then
    const [, facetCountsArg] =
      testState.useShareableResourceMapping.mock.calls.at(-1) ?? [];
    expect(facetCountsArg).toBeUndefined();
  });

  it('should forward search and display mode changes when header actions are used', async () => {
    // Given
    mockEmptyFacetQuery();
    const { user } = testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl={BASE_URL}
      />
    );

    // When
    const searchInput = screen.getByPlaceholderText('GenericActions.Search');
    await user.clear(searchInput);
    await user.type(searchInput, 'search-updated');
    await user.click(
      screen.getByRole('button', { name: 'Service.List.ViewTab' })
    );

    // Then
    expect(testState.setSearch).toHaveBeenCalledWith('search-updated');
    expect(testState.setDisplayMode).toHaveBeenCalledWith(
      ServiceListDisplayMode.Tab
    );
  });

  it('should refetch with an encoded cursor when pagination moves to the next page', async () => {
    // Given
    mockEmptyFacetQuery();
    const { user } = testRender(
      <PublicDocumentsList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        baseUrl={BASE_URL}
      />
    );

    // When
    await user.click(
      screen.getByRole('button', { name: 'GenericActions.Paginate.NextPage' })
    );

    // Then
    expect(testState.refetch).toHaveBeenCalled();
    expect(testState.refetch.mock.calls[0]?.[0]).toEqual({
      count: 10,
      cursor: btoa('10'),
    });
  });
});
