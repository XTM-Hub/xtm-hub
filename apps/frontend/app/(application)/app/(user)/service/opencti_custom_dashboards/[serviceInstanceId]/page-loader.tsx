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
  const { pageSize, search, setSearch, labels, orderMode, orderBy } =
    useServiceListLocalStorage(
      ServiceListLocalStorageKey.OpenCTICustomDashboards
    );

  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
    labels,
  });

  const { queryRef } = useShareableResourceQueryLoader({
    pageSize,
    orderBy,
    orderMode,
    serviceInstanceId: serviceInstance.id,
    searchTerm: search,
    logicalFilters,
  });

  return (
    <>
      {queryRef ? (
        <ShareableResourceServiceList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
          search={search}
          onSearchChange={setSearch}
          type={ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD}
          localStorageKey={ServiceListLocalStorageKey.OpenCTICustomDashboards}
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};

// Component export
export default PageLoader;
