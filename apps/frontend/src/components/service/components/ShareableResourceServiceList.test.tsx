import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { LogicalFilters } from '@/hooks/use-logical-filters-from-storage';
import { toCursor } from '@/hooks/use-table-pagination';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { readTrackedEvents, startAnalytics } from '@/utils/test/analytics';
import testRender from '@/utils/test/test-render';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  DocumentItemFragment,
  DocumentOrdering,
  DocumentStatus,
  FilterKey,
  LogicalOperator,
  OrderingMode,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const SERVICE_INSTANCE_ID = 'service-1';
const PAGE_SIZE = 50;
const LARGE_TOTAL_COUNT = 144;
const FILTERED_TOTAL_COUNT = 4;
const ACTIVE_DOCUMENT_ID = 'active-doc';
const DRAFT_DOCUMENT_ID = 'draft-doc';
const PUBLISHED_RESOURCE_NAME = 'Published connector';
const DRAFT_RESOURCE_NAME = 'Draft connector';

const testState = vi.hoisted(() => ({
  useDocumentsListQuery: vi.fn(),
  useServiceListStorage: vi.fn(),
  useDocumentFacetCounts: vi.fn(),
  useShareableResourceMapping: vi.fn(),
  useServiceCapability: vi.fn(),
  refetch: vi.fn(),
  setPageSize: vi.fn(),
  serviceListProps: vi.fn(),
}));

const makeDocument = (id: string, name: string, status: DocumentStatus) =>
  ({ id, name, status }) as DocumentItemFragment;

const buildDocument = (id: string, published: boolean) =>
  ({ id, status: published ? 'published' : 'draft' }) as DocumentItemFragment;

const withDocuments = (
  totalCount: number,
  nodes: DocumentItemFragment[] = []
) => ({
  data: {
    documents: { totalCount, edges: nodes.map((node) => ({ node })) },
  },
  isLoading: false,
  isError: false,
  refetch: testState.refetch,
});

// Shared reference so unrelated filters don't look "changed" between renders.
const EMPTY_SELECTION = {};

const LOGICAL_FILTERS: LogicalFilters = {
  operator: LogicalOperator.And,
  leaf: null,
  children: [
    {
      operator: null,
      children: null,
      leaf: { key: FilterKey.Label, value: ['label-1'] },
    },
  ],
};

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

vi.mock('@graphql/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useDocumentsListQuery: testState.useDocumentsListQuery,
}));

vi.mock('@/lib/graphql-client', () => ({
  portalGraphqlClient: { _mock: 'portalGraphqlClient' },
}));

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

// Stub ServiceList to keep this test focused on what the list hands it.
vi.mock('@/components/service/components/ServiceList', () => ({
  default: (props: {
    paginationControls?: React.ReactNode;
    active: DocumentItemFragment[];
    draft: DocumentItemFragment[];
  }) => {
    testState.serviceListProps(props);
    return <>{props.paginationControls}</>;
  },
}));

describe('ShareableResourceServiceList', () => {
  const serviceInstance = {
    id: SERVICE_INSTANCE_ID,
    capabilities: [],
  } as serviceInstance_fragment$data;

  const buildElement = (search: string) => (
    <ShareableResourceServiceList
      serviceInstance={serviceInstance}
      logicalFilters={LOGICAL_FILTERS}
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

  const lastQueryVariables = () =>
    testState.useDocumentsListQuery.mock.calls.at(-1)?.[1];

  beforeEach(() => {
    testState.refetch.mockReset();
    testState.setPageSize.mockReset();
    testState.serviceListProps.mockReset();
    testState.useDocumentsListQuery.mockReset();
    testState.useDocumentFacetCounts.mockReturnValue({});
    testState.useShareableResourceMapping.mockReturnValue({ filters: {} });
    testState.useServiceListStorage.mockReturnValue(baseStorageState());
    testState.useServiceCapability.mockReturnValue(false);
    testState.useDocumentsListQuery.mockReturnValue(
      withDocuments(LARGE_TOTAL_COUNT)
    );
  });

  it('should reset the displayed page to the first one when the search term changes after paginating', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await goToSecondPage(user);
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When
    testState.useDocumentsListQuery.mockReturnValue(
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
    testState.useDocumentsListQuery.mockReturnValue(
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
    testState.useDocumentsListQuery.mockReturnValue(
      withDocuments(FILTERED_TOTAL_COUNT)
    );
    rerender(buildElement(''));

    // Then
    expect(container.textContent).toBe(`1 - 4 / ${FILTERED_TOTAL_COUNT}`);
  });

  it('should step back to the new last page when the page the user is on no longer exists', async () => {
    // Given
    const { user, rerender, container } = renderList('');
    await goToSecondPage(user);
    expect(container.textContent).toBe(`51 - 100 / ${LARGE_TOTAL_COUNT}`);

    // When the last document of that page is deleted and the list refetches
    testState.useDocumentsListQuery.mockReturnValue(withDocuments(PAGE_SIZE));
    rerender(buildElement(''));

    // Then
    expect(container.textContent).toBe(`1 - ${PAGE_SIZE} / ${PAGE_SIZE}`);
  });

  it('should not step back while the page shown is a placeholder of the previous one', async () => {
    // Given
    const { user, rerender } = renderList('');
    await goToSecondPage(user);

    // When
    testState.useDocumentsListQuery.mockReturnValue({
      ...withDocuments(PAGE_SIZE),
      isPlaceholderData: true,
    });
    rerender(buildElement(''));

    // Then
    expect(lastQueryVariables().cursor).toBe(toCursor(PAGE_SIZE, 1));
  });

  it('should query the first page of the service instance with the search, the sort and the filters', () => {
    // When
    renderList('my-search');

    // Then
    expect(lastQueryVariables()).toEqual({
      count: PAGE_SIZE,
      cursor: toCursor(PAGE_SIZE, 0),
      orderBy: DocumentOrdering.CreatedAt,
      orderMode: OrderingMode.Asc,
      serviceInstanceId: SERVICE_INSTANCE_ID,
      searchTerm: 'my-search',
      parentsOnly: null,
      logicalFilters: LOGICAL_FILTERS,
    });
  });

  it('should query the next page with its cursor when the user paginates', async () => {
    // Given
    const { user } = renderList('');

    // When
    await goToSecondPage(user);

    // Then
    expect(lastQueryVariables()).toMatchObject({
      count: PAGE_SIZE,
      cursor: toCursor(PAGE_SIZE, 1),
    });
  });

  it('should hand the active documents and the drafts to the list separately', () => {
    // Given
    testState.useDocumentsListQuery.mockReturnValue(
      withDocuments(2, [
        buildDocument(DRAFT_DOCUMENT_ID, false),
        buildDocument(ACTIVE_DOCUMENT_ID, true),
      ])
    );

    // When
    renderList('');

    // Then
    const { active, draft } = testState.serviceListProps.mock.lastCall![0];
    expect(active.map(({ id }: DocumentItemFragment) => id)).toEqual([
      ACTIVE_DOCUMENT_ID,
    ]);
    expect(draft.map(({ id }: DocumentItemFragment) => id)).toEqual([
      DRAFT_DOCUMENT_ID,
    ]);
  });

  it('should show a skeleton instead of the list while the first page loads', () => {
    // Given
    testState.useDocumentsListQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: testState.refetch,
    });

    // When
    const { container } = renderList('');

    // Then
    expect(testState.serviceListProps).not.toHaveBeenCalled();
    expect(container.querySelector('[class*="animate-pulse"]')).not.toBeNull();
  });

  it('should show an error with a retry when the first page cannot be loaded', async () => {
    // Given
    testState.useDocumentsListQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: testState.refetch,
    });
    const { user } = renderList('');

    // When
    await user.click(
      screen.getByRole('button', { name: 'Service.List.Retry' })
    );

    // Then
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Service.List.LoadError'
    );
    expect(testState.refetch).toHaveBeenCalledOnce();
  });

  it('should keep the page on screen when a background refetch fails', () => {
    // Given
    testState.useDocumentsListQuery.mockReturnValue({
      ...withDocuments(LARGE_TOTAL_COUNT),
      isError: true,
    });

    // When
    renderList('');

    // Then
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(testState.serviceListProps).toHaveBeenCalled();
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
      testState.useDocumentsListQuery.mockReturnValue(
        withDocuments(2, [
          makeDocument(
            '0d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
            PUBLISHED_RESOURCE_NAME,
            DocumentStatus.Published
          ),
          makeDocument(
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
