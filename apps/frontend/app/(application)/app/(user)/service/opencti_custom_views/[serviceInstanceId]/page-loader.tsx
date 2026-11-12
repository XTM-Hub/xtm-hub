'use client';

import CustomViewsList from '@/components/service/custom-views/[serviceInstanceId]/CustomViewsList';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const { search, labels, entityTypes, setSearch } = useServiceListStorage(
    ServiceListStorageKey.OpenCTICustomViews
  );
  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
    labels,
    entityTypes,
  });

  return (
    <CustomViewsList
      serviceInstance={serviceInstance}
      logicalFilters={logicalFilters}
      search={search}
      onSearchChange={setSearch}
    />
  );
};

export default PageLoader;
