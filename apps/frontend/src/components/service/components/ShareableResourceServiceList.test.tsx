import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-1';
const PAGE_SIZE = 50;
const LARGE_TOTAL_COUNT = 144;
const FILTERED_TOTAL_COUNT = 4;

const testState = vi.hoisted(() => ({
  usePreloadedQuery: vi.fn(),
  useRefetchableFragment: vi.fn(),
  useServiceListLocalStorage: vi.fn(),
  useDocumentFacetCounts: vi.fn(),
  useShareableResourceMapping: vi.fn(),
  refetch: vi.fn(),
  setPageSize: vi.fn(),
}));

const withDocuments = (totalCount: number) => [
  { documents: { __id: 'connection-1', totalCount, edges: [] } },
  testState.refetch,
];

// Shared reference so unrelated filters don't look "changed" between renders.
const EMPTY_SELECTION = {};

const baseLocalStorageState = () => ({
  pageSize: PAGE_SIZE,
  setPageSize: testState.setPageSize,
  labels: EMPTY_SELECTION,
  entityTypes: EMPTY_SELECTION,
  integrationTypes: EMPTY_SELECTION,
  deployable: EMPTY_SELECTION,
  verified: EMPTY_SELECTION,
  productVersions: EMPTY_SELECTION,
  licenseTypes: EMPTY_SELECTION,
  solutionCategories: EMPTY_SELECTION,
  orderBy: DocumentOrdering.CreatedAt,
  orderMode: OrderingMode.Asc,
});

vi.mock('react-relay', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-relay')>();
  return {
    ...original,
    usePreloadedQuery: testState.usePreloadedQuery,
    useRefetchableFragment: testState.useRefetchableFragment,
    useMutation: () => [vi.fn(), false],
  };
});

vi.mock('@/hooks/use-service-list-local-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-local-storage')
  >()),
  useServiceListLocalStorage: testState.useServiceListLocalStorage,
}));

vi.mock('@/hooks/use-document-facet-counts', () => ({
  useDocumentFacetCounts: testState.useDocumentFacetCounts,
}));

vi.mock('@/utils/shareable-resources/use-shareable-resource-mapping', () => ({
  useShareableResourceMapping: testState.useShareableResourceMapping,
}));

// Stub ServiceList to keep this test focused on the pagination controls it receives.
vi.mock('@/components/service/components/ServiceList', () => ({
  default: (props: { paginationControls?: React.ReactNode }) => (
    <>{props.paginationControls}</>
  ),
}));

describe('ShareableResourceServiceList', () => {
  const serviceInstance = {
    id: SERVICE_INSTANCE_ID,
    capabilities: [],
  } as serviceInstance_fragment$data;
  const queryRef = {} as PreloadedQuery<documentsQuery>;

  const buildElement = (search: string) => (
    <ShareableResourceServiceList
      queryRef={queryRef}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={vi.fn()}
      type={ShareableResourceType.OPENCTI_INTEGRATION}
      localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}
    />
  );

  const renderList = (search: string) => testRender(buildElement(search));

  const goToSecondPage = async (
    user: ReturnType<typeof renderList>['user']
  ) => {
    await user.click(
      screen.getByRole('button', { name: 'GenericActions.Paginate.NextPage' })
    );
  };

  beforeEach(() => {
    testState.refetch.mockReset();
    testState.setPageSize.mockReset();
    testState.usePreloadedQuery.mockReturnValue({});
    testState.useDocumentFacetCounts.mockReturnValue({});
    testState.useShareableResourceMapping.mockReturnValue({ filters: {} });
    testState.useServiceListLocalStorage.mockReturnValue(
      baseLocalStorageState()
    );
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(LARGE_TOTAL_COUNT)
    );
  });

  it('should reset the displayed page to the first one when the search term changes after paginating', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await goToSecondPage(user);
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(FILTERED_TOTAL_COUNT)
    );
    rerender(buildElement('narrow-search'));

    // Then
    expect(container.textContent).toBe(`1 - 4 / ${FILTERED_TOTAL_COUNT}`);
  });

  it('should reset the displayed page to the first one when a filter changes after paginating', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await goToSecondPage(user);
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When
    testState.useServiceListLocalStorage.mockReturnValue({
      ...baseLocalStorageState(),
      labels: { 'label-1': true },
    });
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(FILTERED_TOTAL_COUNT)
    );
    rerender(buildElement(''));

    // Then
    expect(container.textContent).toBe(`1 - 4 / ${FILTERED_TOTAL_COUNT}`);
  });

  it('should reset the displayed page to the first one when the sort order changes after paginating', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await goToSecondPage(user);
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When
    testState.useServiceListLocalStorage.mockReturnValue({
      ...baseLocalStorageState(),
      orderBy: DocumentOrdering.Name,
      orderMode: OrderingMode.Desc,
    });
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(FILTERED_TOTAL_COUNT)
    );
    rerender(buildElement(''));

    // Then
    expect(container.textContent).toBe(`1 - 4 / ${FILTERED_TOTAL_COUNT}`);
  });
});
