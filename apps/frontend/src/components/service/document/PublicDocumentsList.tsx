import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { toServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { ServiceListHeader } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import {
  publicDocumentListItem,
  PublicDocumentListQuery,
} from '@/components/service/document/public-document.graphql';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { PublicShareableResourceList } from '@/components/ui/shareable-resource/PublicShareableResourceList';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { portalGraphqlClient } from '@/lib/graphql-client';
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
import { LogicalFilterInput, useDocumentFacetsQuery } from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
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

  const logicalFilters = useLogicalFiltersFromStorage(
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS
      ? {
          serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
          labels,
          deployable,
          verified,
          integrationTypes,
          productVersions,
          licenseTypes,
          solutionCategories,
        }
      : {
          serviceInstanceSlug: serviceInstanceSlug as
            | ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS
            | ServiceSlug.OPEN_AEV_SCENARIOS
            | ServiceSlug.OPEN_CTI_PLAYBOOKS
            | ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
          labels,
          entityTypes,
        }
  );

  const { data: facetData } = useDocumentFacetsQuery(
    portalGraphqlClient,
    {
      input: {
        serviceInstanceId: serviceInstance.id,
        documentType:
          SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING[serviceInstanceSlug],
        searchTerm: search,
        // useLogicalFiltersFromStorage is shared with the (still-Relay) documents
        // query, so it's typed against Relay's LogicalFilterInput (all fields
        // optional). The react-query codegen output for the same schema input
        // type has `avoidOptionals` enabled, making fields required-but-nullable
        // instead — structurally identical at runtime, just a stricter TS shape.
        logicalFilters: logicalFilters as LogicalFilterInput,
      },
    },
    { placeholderData: keepPreviousData }
  );

  // `facetData` is `undefined` until the query has resolved at least once
  // (react-query's initial-fetch state). Returning `undefined` here — instead
  // of computing all-zero counts — lets each filter badge stay hidden rather
  // than briefly rendering "(0)" before the real counts arrive. Once fetched,
  // `placeholderData: keepPreviousData` keeps `facetData` populated across
  // refetches, so this only ever gates the very first paint.
  const facetCounts = useMemo(
    () =>
      facetData === undefined
        ? undefined
        : toServiceListFacetCounts(facetData.documentFacets),
    [facetData]
  );

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
