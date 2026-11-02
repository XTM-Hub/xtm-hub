import { FilterSidebar } from '@/components/service/components/header/filter/FilterSidebar';
import { IntegrationsCsvExportButton } from '@/components/service/components/header/IntegrationsCsvExportButton';
import { ServiceListHeader } from '@/components/service/components/header/ServiceListHeader';
import { AppServiceListStorageKeyContext } from '@/components/service/components/ServiceListStorageKeyContext';
import {
  publicDocumentListItem,
  PublicDocumentListQuery,
} from '@/components/service/document/public-document.graphql';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { PublicShareableResourceList } from '@/components/ui/shareable-resource/PublicShareableResourceList';
import { useDocumentFacetCounts } from '@/hooks/use-document-facet-counts';
import useScrollPosition from '@/hooks/use-scroll-position';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { useStickyHeaderOffset } from '@/hooks/use-sticky-header-offset';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { APP_PATH } from '@/utils/path/constant';
import { encodeRedirectValue } from '@/utils/redirect';
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
import { SeoServiceInstanceItemFragment } from '@graphql/generated';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  PreloadedQuery,
  readInlineData,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

interface PublicDocumentsListProps {
  serviceInstance: SeoServiceInstanceItemFragment;
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

  const facetCounts = useDocumentFacetCounts({
    serviceInstanceId: serviceInstance.id,
    documentType: SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING[serviceInstanceSlug],
    search,
    serviceInstanceSlug,
    restrictToActiveDocuments: true,
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

  const { pagination, setPagination, onPaginationChange } = useTablePagination({
    pageSize,
    setPageSize,
    onPaginationChange: (nextPagination, nextCursor) => {
      refetch({ count: nextPagination.pageSize, cursor: nextCursor });
    },
  });

  // Reset the page on search/filter/sort change so it stays in sync with the refetched data.
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [
    setPagination,
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

  const headerRef = useRef<HTMLDivElement>(null);
  useStickyHeaderOffset(headerRef);

  const isIntegrationsService =
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS;

  return (
    <AppServiceListStorageKeyContext storageKey={storageKey}>
      <div
        ref={headerRef}
        className="sticky top-0 py-3 z-15 relative bg-gradient-default">
        <ServiceListHeader
          search={search}
          onSearchChange={setSearch}
          className="mb-3"
          onDisplayModeChange={setDisplayMode}
          filters={filters}
          exportAction={
            isIntegrationsService ? (
              <IntegrationsCsvExportButton
                serviceInstanceId={serviceInstance.id}
                isAuthenticated={false}
                loginRedirectPath={`/${APP_PATH}/service/opencti_integrations/${encodeRedirectValue(serviceInstance.id)}`}
                type={
                  SERVICE_SLUG_SHAREABLE_RESOURCE_MAPPING[serviceInstanceSlug]
                }
              />
            ) : undefined
          }
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
        <div className="grow shrink min-w-0 px-3 pb-3">
          <PublicShareableResourceList
            displayMode={selectedDisplayMode}
            documents={documents}
            serviceInstance={serviceInstance}
            baseUrl={baseUrl}
          />
        </div>
      </div>
    </AppServiceListStorageKeyContext>
  );
};

export default PublicDocumentsList;
