import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import testRender from '@/utils/test/test-render';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
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

// ServiceList pulls in a large tree of unrelated hooks/components (capabilities, hero
// section, filter sidebar, document list...); stubbing it keeps this test focused on the
// pagination controls it receives.
vi.mock('@/components/service/components/ServiceList', () => ({
  default: (props: { paginationControls?: React.ReactNode }) => (
    <>{props.paginationControls}</>
  ),
}));

describe('ShareableResourceServiceList', () => {
  const serviceInstance = {
    id: SERVICE_INSTANCE_ID,
  } as Partial<serviceInstance_fragment$data>;
  const queryRef = {} as PreloadedQuery<documentsQuery>;

  const renderList = (search: string) =>
    testRender(
      <ShareableResourceServiceList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        search={search}
        onSearchChange={vi.fn()}
        type={ShareableResourceType.OPENCTI_INTEGRATION}
        localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}
      />
    );

  beforeEach(() => {
    testState.refetch.mockReset();
    testState.setPageSize.mockReset();
    testState.usePreloadedQuery.mockReturnValue({});
    testState.useDocumentFacetCounts.mockReturnValue({});
    testState.useShareableResourceMapping.mockReturnValue({ filters: {} });
    testState.useServiceListLocalStorage.mockReturnValue({
      pageSize: PAGE_SIZE,
      setPageSize: testState.setPageSize,
      labels: {},
      entityTypes: {},
      integrationTypes: {},
      deployable: {},
      verified: {},
      productVersions: {},
      licenseTypes: {},
      solutionCategories: {},
    });
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(LARGE_TOTAL_COUNT)
    );
  });

  it('should reset the displayed page to the first one when the search term changes after paginating', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await user.click(
      screen.getByRole('button', { name: 'GenericActions.Paginate.NextPage' })
    );
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When: applying a search that narrows the result set down to a smaller page
    testState.useRefetchableFragment.mockReturnValue(
      withDocuments(FILTERED_TOTAL_COUNT)
    );
    rerender(
      <ShareableResourceServiceList
        queryRef={queryRef}
        serviceInstance={serviceInstance}
        search="narrow-search"
        onSearchChange={vi.fn()}
        type={ShareableResourceType.OPENCTI_INTEGRATION}
        localStorageKey={ServiceListLocalStorageKey.OpenCTIIntegrationFeeds}
      />
    );

    // Then: the pagination display goes back to page 1 instead of keeping the stale
    // "51 - ..." offset against the new, smaller total count.
    expect(container.textContent).toBe(`1 - 4 / ${FILTERED_TOTAL_COUNT}`);
  });
});
