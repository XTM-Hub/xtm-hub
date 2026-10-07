import { AppServiceContext } from '@/components/service/components/ServiceContext';
import ServiceList from '@/components/service/components/ServiceList';
import { AppServiceListLocalStorageKeyContext } from '@/components/service/components/ServiceListLocalStorageKeyContext';
import HuntPackLoadError from '@/components/service/opencti-hunt-packs/HuntPackLoadError';
import {
  toDocumentItem,
  useHuntPackDocumentContext,
} from '@/components/service/opencti-hunt-packs/hunt-pack-documents';
import { PaginationControls } from '@/components/ui/pagination/PaginationControls';
import { useDocumentFacetCounts } from '@/hooks/use-document-facet-counts';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING,
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { Skeleton } from '@filigran/ui';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  LogicalFilterInput,
  useHuntPackDocumentsQuery,
} from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

const LOCAL_STORAGE_KEY = ServiceListLocalStorageKey.OpenCTIHuntPacks;
const TYPE = ShareableResourceType.OPENCTI_HUNT_PACK;
const SKELETON_CARD_COUNT = 6;

interface HuntPackServiceListProps {
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

/**
 * The hunt packs library list: the behaviour of `ShareableResourceServiceList`
 * (active and draft split, document actions, facets, paginated `ServiceList`)
 * with the documents read through React Query.
 */
const HuntPackServiceList = ({
  serviceInstance,
  search,
  onSearchChange,
}: HuntPackServiceListProps) => {
  const t = useTranslate();
  const context = useHuntPackDocumentContext(serviceInstance);
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
    connectorTypes,
    orderBy,
    orderMode,
  } = useServiceListLocalStorage(LOCAL_STORAGE_KEY);
  const { pagination, setPagination, cursor, onPaginationChange } =
    useTablePagination({ pageSize, setPageSize });
  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_HUNT_PACKS,
    labels,
  });

  // Reset the page on search/filter/sort change so it stays in sync with the data.
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
    connectorTypes,
    orderBy,
    orderMode,
  ]);

  const { data, error, isPending, isError, isFetching, refetch } =
    useHuntPackDocumentsQuery(
      portalGraphqlClient,
      {
        count: pagination.pageSize,
        cursor: pagination.pageIndex > 0 ? cursor : null,
        orderBy,
        orderMode,
        searchTerm: search,
        logicalFilters: logicalFilters as LogicalFilterInput,
        serviceInstanceId: serviceInstance.id,
      },
      { placeholderData: keepPreviousData }
    );

  const [active, draft] = useMemo(() => {
    const documents = (data?.documents.edges ?? []).map(({ node }) =>
      toDocumentItem(node)
    );
    return [
      documents.filter((document) => document.active),
      documents.filter((document) => !document.active),
    ];
  }, [data]);

  const serviceInstanceSlug = SHAREABLE_RESOURCE_SERVICE_SLUG_MAPPING[TYPE];
  const facetCounts = useDocumentFacetCounts({
    serviceInstanceId: serviceInstance.id,
    documentType: TYPE,
    search,
    serviceInstanceSlug,
    restrictToActiveDocuments: false,
    labels,
    entityTypes,
    deployable,
    verified,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
    connectorTypes,
  });
  const { filters } = useShareableResourceMapping(
    serviceInstanceSlug,
    facetCounts
  );

  if (isPending) {
    return (
      <ul
        aria-busy="true"
        aria-label={t('Utils.Loading')}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-l px-m pb-m">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <li key={index}>
            <Skeleton className="rounded h-[300px] sm:h-[348px]" />
          </li>
        ))}
      </ul>
    );
  }
  if (isError) {
    return (
      <HuntPackLoadError
        error={error}
        description={t('Service.OpenCTIHuntPack.LoadError.Library')}
        retrying={isFetching}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <AppServiceContext {...context}>
      <AppServiceListLocalStorageKeyContext localStorageKey={LOCAL_STORAGE_KEY}>
        <ServiceList
          active={active}
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
      </AppServiceListLocalStorageKeyContext>
    </AppServiceContext>
  );
};

export default HuntPackServiceList;
