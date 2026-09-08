import { toServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { useActiveAndDraftSplit } from '@/components/service/components/service-list-utils';
import { AppServiceContext } from '@/components/service/components/ServiceContext';
import ServiceList from '@/components/service/components/ServiceList';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  documentItem,
  documentsFragment,
  DocumentsListQuery,
} from '@/components/service/document/document.graphql';
import { FacetDocumentListQuery } from '@/components/service/document/public-document.graphql';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTablePagination } from '@/hooks/use-table-pagination';
import {
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { documentFacets } from '@generated/documentFacets.graphql';
import {
  documentItem_fragment$data,
  documentItem_fragment$key,
} from '@generated/documentItem_fragment.graphql';
import { documentsList$key } from '@generated/documentsList.graphql';
import {
  documentsQuery,
  documentsQuery$variables,
} from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { useMemo } from 'react';
import {
  PreloadedQuery,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

export interface ShareableResourceServiceListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  queryRefFacet: PreloadedQuery<documentFacets>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
  type: ShareableResourceType;
  localStorageKey: ServiceListLocalStorageKey;
}

/**
 * Mutualizes the behaviour shared by every shareable-resource list (integrations, custom
 * dashboards, custom views, OpenAEV scenarios, OpenCTI playbooks): loading the documents
 * connection, splitting active/draft documents, wiring the document CRUD context, and
 * rendering the paginated `ServiceList`. Resource-specific filters are passed in via
 * `additionalFilters`.
 */
const ShareableResourceServiceList = ({
  queryRef,
  queryRefFacet,
  serviceInstance,
  search,
  onSearchChange,
  type,
  localStorageKey,
}: ShareableResourceServiceListProps) => {
  const queryData = usePreloadedQuery<documentsQuery>(
    DocumentsListQuery,
    queryRef
  );

  const [data, refetch] = useRefetchableFragment<
    documentsQuery,
    documentsList$key
  >(documentsFragment, queryData);

  const [active, draft] = useActiveAndDraftSplit<
    documentItem_fragment$data,
    documentItem_fragment$key
  >(data?.documents.edges, documentItem);

  const connectionId = data?.documents.__id;

  const context = useDocumentContext({
    serviceInstance,
    connectionId,
    type,
  });

  const { pageSize, setPageSize } = useServiceListLocalStorage(localStorageKey);

  const { pagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      refetch({
        count: nextPagination.pageSize,
        cursor: nextCursor,
      } satisfies Partial<documentsQuery$variables>);
    },
  });

  const queryDataFacet = usePreloadedQuery<documentFacets>(
    FacetDocumentListQuery,
    queryRefFacet
  );

  const facetCounts = useMemo(
    () => toServiceListFacetCounts(queryDataFacet.documentFacets),
    [queryDataFacet.documentFacets]
  );

  const { filters } = useShareableResourceMapping(
    SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[type],
    facetCounts
  );

  return (
    <AppServiceContext {...context}>
      <AppServiceListLocalStorageKeyContext localStorageKey={localStorageKey}>
        <ServiceList
          active={active}
          draft={draft}
          search={search}
          onSearchChange={onSearchChange}
          additionalFilters={filters}
          connectionId={connectionId}
          paginationControls={
            <PaginationControls
              totalCount={data.documents.totalCount}
              pageSize={pageSize}
              pageIndex={pagination.pageIndex}
              onPaginationChange={onPaginationChange}
              onSetPageSize={setPageSize}
            />
          }
        />
      </AppServiceListLocalStorageKeyContext>
    </AppServiceContext>
  );
};

export default ShareableResourceServiceList;
