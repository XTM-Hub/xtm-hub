'use client';

import CustomViewsList from '@/components/service/custom-views/[serviceInstanceId]/CustomViewsList';
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
  const { count, search, labels, entityTypes, setSearch, orderMode, orderBy } =
    useServiceListLocalStorage(ServiceListLocalStorageKey.OpenCTICustomViews);
  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
    labels,
    entityTypes,
  });

  const { queryRef, queryRefFacet } = useShareableResourceQueryLoader({
    pageSize: count,
    orderBy,
    orderMode,
    serviceInstanceId: serviceInstance.id,
    searchTerm: search,
    logicalFilters,
    documentType: ShareableResourceType.OPENCTI_CUSTOM_VIEW,
  });

  return (
    <>
      {queryRef && queryRefFacet ? (
        <CustomViewsList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
          queryRefFacet={queryRefFacet}
          search={search}
          onSearchChange={setSearch}
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};

export default PageLoader;
