import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  DocumentOrdering,
  DocumentStatus,
  OrderingMode,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { PreloadedQuery } from 'react-relay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-1';
const PAGE_SIZE = 50;
const LARGE_TOTAL_COUNT = 144;
const FILTERED_TOTAL_COUNT = 4;
const PUBLISHED_RESOURCE_NAME = 'Published connector';
const DRAFT_RESOURCE_NAME = 'Draft connector';

const testState = vi.hoisted(() => ({
  usePreloadedQuery: vi.fn(),
  useRefetchableFragment: vi.fn(),
  useServiceListStorage: vi.fn(),
  useDocumentFacetCounts: vi.fn(),
  useShareableResourceMapping: vi.fn(),
  useServiceCapability: vi.fn(),
  refetch: vi.fn(),
  setPageSize: vi.fn(),
}));

const makeEdge = (id: string, name: string, status: DocumentStatus) => ({
  node: { id, name, status },
});

const withDocuments = (
  totalCount: number,
  edges: ReturnType<typeof makeEdge>[] = []
) => [
  { documents: { __id: 'connection-1', totalCount, edges } },
  testState.refetch,
];

// Shared reference so unrelated filters don't look "changed" between renders.
const EMPTY_SELECTION = {};

const baseStorageState = () => ({
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
    readInlineData: (_fragment: unknown, node: unknown) => node,
    useMutation: () => [vi.fn(), false],
  };
});

vi.mock('@/hooks/use-service-list-storage', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/hooks/use-service-list-storage')
  >()),
  useServiceListStorage: testState.useServiceListStorage,
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: testState.useServiceCapability,
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
  const queryRef = { variables: {} } as PreloadedQuery<documentsQuery>;

  const buildElement = (search: string) => (
    <ShareableResourceServiceList
      queryRef={queryRef}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={vi.fn()}
      type={ShareableResourceType.OPENCTI_INTEGRATION}
      storageKey={ServiceListStorageKey.OpenCTIIntegrationFeeds}
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
    testState.useServiceListStorage.mockReturnValue(baseStorageState());
    testState.useServiceCapability.mockReturnValue(false);
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
    testState.useServiceListStorage.mockReturnValue({
      ...baseStorageState(),
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
    testState.useServiceListStorage.mockReturnValue({
      ...baseStorageState(),
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

  it.each([
    [
      'the drafts first',
      'can see the drafts',
      true,
      [
        expect.objectContaining({ item_name: DRAFT_RESOURCE_NAME, index: 0 }),
        expect.objectContaining({
          item_name: PUBLISHED_RESOURCE_NAME,
          index: 1,
        }),
      ],
    ],
    [
      'only the published resources',
      'cannot see the drafts',
      false,
      [
        expect.objectContaining({
          item_name: PUBLISHED_RESOURCE_NAME,
          index: 0,
        }),
      ],
    ],
  ])(
    'should list %s in the displayed order when the user %s',
    (_items, _context, canSeeDrafts, expectedItems) => {
      // Given
      startAnalytics();
      testState.useServiceCapability.mockReturnValue(canSeeDrafts);
      testState.useRefetchableFragment.mockReturnValue(
        withDocuments(2, [
          makeEdge(
            '0d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            PUBLISHED_RESOURCE_NAME,
            DocumentStatus.Published
          ),
          makeEdge(
            '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
            DRAFT_RESOURCE_NAME,
            DocumentStatus.Draft
          ),
        ])
      );

      // When
      renderList('');

      // Then
      expect(readTrackedEvents('view_item_list')).toEqual([
        expect.objectContaining({ items: expectedItems }),
      ]);
    }
  );
});
