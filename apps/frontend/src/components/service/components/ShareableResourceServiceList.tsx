import { splitPublishedAndOthers } from '@/components/service/components/service-list-utils';
import { AppServiceContext } from '@/components/service/components/ServiceContext';
import ServiceList from '@/components/service/components/ServiceList';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { ServiceLoadError } from '@/components/service/components/ServiceLoadError';
import { useDocumentContext } from '@/components/service/document/use-document-context';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentFacetCounts } from '@/hooks/use-document-facet-counts';
import { LogicalFilters } from '@/hooks/use-logical-filters-from-storage';
import { useResourceListAnalytics } from '@/hooks/use-resource-list-analytics';
import useServiceCapability from '@/hooks/use-service-capability';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import {
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { ServiceRestriction, useDocumentsListQuery } from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export interface ShareableResourceServiceListProps {
  serviceInstance: serviceInstance_fragment$data;
  logicalFilters: LogicalFilters;
  search: string;
  onSearchChange: (v: string) => void;
  type: ShareableResourceType;
  storageKey: ServiceListStorageKey;
}

/**
 * Mutualizes the behaviour shared by every shareable-resource list (integrations, custom
 * dashboards, custom views, OpenAEV scenarios, OpenCTI playbooks): loading the documents
 * connection, splitting published/draft documents, wiring the document CRUD context, and
 * rendering the paginated `ServiceList`. Resource-specific filters are passed in via
 * `logicalFilters`.
 */
const ShareableResourceServiceList = ({
  serviceInstance,
  logicalFilters,
  search,
  onSearchChange,
  type,
  storageKey,
}: ShareableResourceServiceListProps) => {
  const t = useTranslate();

  const context = useDocumentContext({
    serviceInstance,
    type,
  });

  const {
    pageSize,
    setPageSize,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
    orderBy,
    orderMode,
  } = useServiceListStorage(storageKey);

  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({ pageSize, setPageSize });

  // Reset the page on search/filter/sort change. Done while rendering, not in an
  // effect, so the stale cursor of the previous page is never sent with the new filters.
  const filtersSignature = JSON.stringify([
    search,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
    orderBy,
    orderMode,
  ]);
  const [appliedFiltersSignature, setAppliedFiltersSignature] =
    useState(filtersSignature);
  if (appliedFiltersSignature !== filtersSignature) {
    setAppliedFiltersSignature(filtersSignature);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } =
    useDocumentsListQuery(
      portalGraphqlClient,
      {
        count: pagination.pageSize,
        cursor,
        orderBy,
        orderMode,
        serviceInstanceId: serviceInstance.id,
        searchTerm: search,
        parentsOnly: null,
        logicalFilters,
      },
      { placeholderData: keepPreviousData }
    );

  // Deleting the last document of the last page refetches that page empty. Step
  // back to the new last one, the same way as a filter change resets the page.
  // Only once the page has settled: an invalidated page that was cached while
  // inactive is served stale while it refetches, and its count is out of date.
  const lastPageIndex = Math.max(
    0,
    Math.ceil((data?.documents.totalCount ?? 0) / pagination.pageSize) - 1
  );
  if (
    data &&
    !isPlaceholderData &&
    !isFetching &&
    !isError &&
    pagination.pageIndex > lastPageIndex
  ) {
    setPagination((prev) => ({ ...prev, pageIndex: lastPageIndex }));
  }

  const [published, draft] = useMemo(
    () =>
      splitPublishedAndOthers(
        (data?.documents.edges ?? []).map(({ node }) => node)
      ),
    [data]
  );

  const canSeeDrafts = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  const visibleResources = useMemo(
    () => (canSeeDrafts ? [...draft, ...published] : published),
    [canSeeDrafts, draft, published]
  );

  useResourceListAnalytics({
    resourceType: type,
    variables: {
      searchTerm: search,
      logicalFilters,
    },
    totalCount: data?.documents.totalCount ?? 0,
    resources: visibleResources,
    enabled: !!data && !isPlaceholderData,
  });

  const serviceInstanceSlug = SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[type];

  const facetCounts = useDocumentFacetCounts({
    serviceInstanceId: serviceInstance.id,
    documentType: type,
    search,
    serviceInstanceSlug,
    restrictToPublishedDocuments: false,
    labels,
    entityTypes,
    deployable,
    verified,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
  });

  const { filters } = useShareableResourceMapping(
    serviceInstanceSlug,
    facetCounts
  );

  // A failed background refetch keeps the page already on screen.
  if (isError && !data) {
    return (
      <ServiceLoadError
        message={t('Service.List.LoadError')}
        retryAnalyticsId="resource_list_refresh"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return <Skeleton className="w-full inset-1/2" />;
  }

  return (
    <AppServiceContext {...context}>
      <AppServiceListStorageKeyContext storageKey={storageKey}>
        <ServiceList
          active={published}
          draft={draft}
          search={search}
          onSearchChange={onSearchChange}
          additionalFilters={filters}
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
      </AppServiceListStorageKeyContext>
    </AppServiceContext>
  );
};

export default ShareableResourceServiceList;
