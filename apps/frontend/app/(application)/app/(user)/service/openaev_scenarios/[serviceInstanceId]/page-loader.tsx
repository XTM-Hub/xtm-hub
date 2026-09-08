'use client';

import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useShareableResourceQueryLoader } from '@/hooks/use-shareable-resource-query-loader';
import {
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { Skeleton } from '@filigran/ui';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const { count, search, labels, setSearch, orderMode, orderBy } =
    useServiceListLocalStorage(ServiceListLocalStorageKey.OpenAEVScenarios);
  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_AEV_SCENARIOS,
    labels,
  });

  const { queryRef, queryRefFacet } = useShareableResourceQueryLoader({
    pageSize: count,
    orderBy,
    orderMode,
    serviceInstanceId: serviceInstance.id,
    searchTerm: search,
    logicalFilters,
    documentType: ShareableResourceType.OPENAEV_SCENARIO,
  });

  return (
    <>
      {queryRef && queryRefFacet ? (
        <ShareableResourceServiceList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
          queryRefFacet={queryRefFacet}
          search={search}
          onSearchChange={setSearch}
          type={ShareableResourceType.OPENAEV_SCENARIO}
          localStorageKey={ServiceListLocalStorageKey.OpenAEVScenarios}
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};

// Component export
export default PageLoader;
