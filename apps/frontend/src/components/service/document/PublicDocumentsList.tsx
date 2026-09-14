import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { ServiceListHeader } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  publicDocumentListItem,
  PublicDocumentListQuery,
} from '@/components/service/document/public-document.graphql';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { PublicShareableResourceList } from '@/components/ui/shareable-resource/PublicShareableResourceList';
import { useDocumentFacetCounts } from '@/hooks/use-document-facet-counts';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { useTablePagination } from '@/hooks/use-table-pagination';
import {
  SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING,
  ServiceSlug,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import publicDocumentListGraphql, {
  publicDocumentList$key,
} from '@generated/publicDocumentList.graphql';
import { publicDocumentListItemFragment$key } from '@generated/publicDocumentListItemFragment.graphql';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  PreloadedQuery,
  readInlineData,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

interface PublicDocumentsListProps {
  serviceInstance: seoServiceInstanceFragment$data;
  queryRef: PreloadedQuery<publicDocumentsQuery>;
  baseUrl: string;
}

const PublicDocumentsList = ({
  queryRef,
  serviceInstance,
  baseUrl,
}: PublicDocumentsListProps) => {
  const queryData = usePreloadedQuery<publicDocumentsQuery>(
    PublicDocumentListQuery,
    queryRef
  );

  const [data, refetch] = useRefetchableFragment<
    publicDocumentsQuery,
    publicDocumentList$key
  >(publicDocumentListGraphql, queryData);

  const serviceInstanceSlug = serviceInstance.slug as ServiceSlug;
  const { localStorageKey } = useShareableResourceMapping(serviceInstanceSlug);

  const {
    search,
    setSearch,
    pageSize,
    setPageSize,
    displayMode: selectedDisplayMode,
    setDisplayMode,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
  } = useServiceListLocalStorage(localStorageKey);

  const facetCounts = useDocumentFacetCounts({
    serviceInstanceId: serviceInstance.id,
    documentType: SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING[serviceInstanceSlug],
    search,
    serviceInstanceSlug,
    labels,
    entityTypes,
    deployable,
    verified,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
  });

  const documents = useMemo(() => {
    return (data.publicDocuments?.edges ?? [])
      .map(({ node }) =>
        readInlineData<publicDocumentListItemFragment$key>(
          publicDocumentListItem,
          node
        )
      )
      .filter((l) => !!l);
  }, [data.publicDocuments]);

  const { filters } = useShareableResourceMapping(
    serviceInstanceSlug,
    facetCounts
  );

  const { restore } = useScrollPosition();

  useLayoutEffect(() => {
    restore();
  }, [restore]);

  const { pagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      refetch({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeaderOffset(headerRef);

  return (
    <AppServiceListLocalStorageKeyContext localStorageKey={localStorageKey}>
      <div
        ref={headerRef}
        className="sticky top-0 py-m z-15 relative bg-gradient-background">
        <ServiceListHeader
          search={search}
          onSearchChange={setSearch}
          className="mb-3"
          onDisplayModeChange={setDisplayMode}
          paginationControls={
            <PaginationControls
              totalCount={data.publicDocuments.totalCount}
              pageSize={pageSize}
              pageIndex={pagination.pageIndex}
              onPaginationChange={onPaginationChange}
              onSetPageSize={setPageSize}
            />
          }
        />
      </div>
      <div className="flex flex-row">
        <FilterSidebar filters={filters} />
        <div className="grow shrink min-w-0 px-m pb-m">
          <PublicShareableResourceList
            displayMode={selectedDisplayMode}
            documents={documents}
            serviceInstance={serviceInstance}
            baseUrl={baseUrl}
          />
        </div>
      </div>
    </AppServiceListLocalStorageKeyContext>
  );
};

export default PublicDocumentsList;
