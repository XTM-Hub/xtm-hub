'use client';

import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { IntegrationsCsvExportButton } from '@/components/service/components/header/IntegrationsCsvExportButton';
import { ServiceListHeader } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import { IntegrationListUrlFiltersSync } from '@/components/service/integrations/[serviceInstanceId]/IntegrationListUrlFiltersSync';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { PublicShareableResourceList } from '@/components/ui/shareable-resource/PublicShareableResourceList';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentFacetCounts } from '@/hooks/use-document-facet-counts';
import {
  LogicalFiltersParams,
  useLogicalFiltersFromStorage,
} from '@/hooks/use-logical-filters-from-storage';
import { useResourceListAnalytics } from '@/hooks/use-resource-list-analytics';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { APP_PATH } from '@/utils/path/constant';
import { encodeRedirectValue } from '@/utils/redirect';
import {
  SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING,
  ServiceSlug,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { Button } from '@filigran/design-system';
import {
  LogicalFilterInput,
  PublicDocumentListItemFragment,
  SeoServiceInstanceItemFragment,
  usePublicDocumentsQuery,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface PublicDocumentsListProps {
  serviceInstance: SeoServiceInstanceItemFragment;
  baseUrl: string;
}

const PublicDocumentsList = ({
  serviceInstance,
  baseUrl,
}: PublicDocumentsListProps) => {
  const t = useTranslate();
  const serviceInstanceSlug = serviceInstance.slug as ServiceSlug;
  const resourceType =
    SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING[serviceInstanceSlug];
  const { storageKey } = useShareableResourceMapping(serviceInstanceSlug);

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
    orderBy,
    orderMode,
  } = useServiceListStorage(storageKey);

  const isIntegrationsService =
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS;
  const logicalFilterParams: LogicalFiltersParams = isIntegrationsService
    ? {
        serviceInstanceSlug:
          serviceInstanceSlug as ServiceSlug.OPEN_CTI_INTEGRATIONS,
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
      };
  const logicalFilters = useLogicalFiltersFromStorage(logicalFilterParams);

  const facetCounts = useDocumentFacetCounts({
    serviceInstanceId: serviceInstance.id,
    documentType: resourceType,
    search,
    serviceInstanceSlug,
    restrictToPublishedDocuments: true,
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

  const { restore } = useScrollPosition();

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

  const { data, isLoading, isError, isPlaceholderData, refetch } =
    usePublicDocumentsQuery(
      portalGraphqlClient,
      {
        slug: serviceInstance.slug ?? '',
        count: pagination.pageSize,
        cursor,
        orderBy,
        orderMode,
        serviceInstanceId: serviceInstance.id,
        searchTerm: search,
        logicalFilters:
          (logicalFilters as LogicalFilterInput | undefined) ?? null,
      },
      { placeholderData: keepPreviousData }
    );

  // Wait for the first page: the skeleton is shorter than the list, so restoring
  // earlier would clamp the saved position.
  useLayoutEffect(() => {
    if (isLoading) return;
    restore();
  }, [restore, isLoading]);

  const documents = useMemo(
    () =>
      (data?.publicDocuments.edges ?? []).map(
        ({ node }): PublicDocumentListItemFragment => node
      ),
    [data]
  );

  useResourceListAnalytics({
    resourceType,
    variables: {
      searchTerm: search,
      logicalFilters:
        (logicalFilters as LogicalFilterInput | undefined) ?? null,
    },
    totalCount: data?.publicDocuments.totalCount ?? 0,
    resources: documents,
    enabled: !!data && !isPlaceholderData,
  });

  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeaderOffset(headerRef);

  // The header stays mounted while the first page loads: `useStickyHeaderOffset`
  // measures it once, on mount, and the URL filters sync must run before the
  // first page is fetched with the wrong filters.
  const renderList = () => {
    // A failed background refetch keeps the page already on screen.
    if (isError && !data) {
      return (
        <div
          role="alert"
          className="my-4 flex flex-col items-center gap-3 text-center">
          <p>{t('Service.List.LoadError')}</p>
          <Button
            priority="secondary"
            onClick={() => void refetch()}>
            {t('Service.List.Retry')}
          </Button>
        </div>
      );
    }
    if (isLoading) {
      return <Skeleton className="h-64 w-full layer-1 bg-elevation-default" />;
    }
    return (
      <PublicShareableResourceList
        displayMode={selectedDisplayMode}
        documents={documents}
        serviceInstance={serviceInstance}
        baseUrl={baseUrl}
      />
    );
  };

  return (
    <AppServiceListStorageKeyContext storageKey={storageKey}>
      {isIntegrationsService && <IntegrationListUrlFiltersSync />}
      <div
        ref={headerRef}
        className="sticky top-0 py-3 z-15 relative bg-gradient-default">
        <ServiceListHeader
          search={search}
          onSearchChange={setSearch}
          resourceType={resourceType}
          className="mb-3"
          onDisplayModeChange={setDisplayMode}
          filters={filters}
          exportAction={
            isIntegrationsService ? (
              <IntegrationsCsvExportButton
                serviceInstanceId={serviceInstance.id}
                isAuthenticated={false}
                loginRedirectPath={`/${APP_PATH}/service/opencti_integrations/${encodeRedirectValue(serviceInstance.id)}`}
                type={resourceType}
              />
            ) : undefined
          }
          paginationControls={
            data ? (
              <PaginationControls
                totalCount={data.publicDocuments.totalCount}
                pageSize={pageSize}
                pageIndex={pagination.pageIndex}
                onPaginationChange={onPaginationChange}
                onSetPageSize={setPageSize}
              />
            ) : undefined
          }
        />
      </div>
      <div className="flex flex-row">
        <FilterSidebar filters={filters} />
        <div className="grow shrink min-w-0 px-3 pb-3">{renderList()}</div>
      </div>
    </AppServiceListStorageKeyContext>
  );
};

export default PublicDocumentsList;
