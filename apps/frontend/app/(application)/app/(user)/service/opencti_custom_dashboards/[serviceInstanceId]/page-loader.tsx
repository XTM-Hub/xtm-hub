'use client';

import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceListStorageKey } from '@/utils/filters-storage.utils';
import {
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const { search, setSearch, labels } = useServiceListStorage(
    ServiceListStorageKey.OpenCTICustomDashboards
  );

  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
    labels,
  });

  return (
    <ShareableResourceServiceList
      serviceInstance={serviceInstance}
      logicalFilters={logicalFilters}
      search={search}
      onSearchChange={setSearch}
      type={ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD}
      storageKey={ServiceListStorageKey.OpenCTICustomDashboards}
    />
  );
};

// Component export
export default PageLoader;
