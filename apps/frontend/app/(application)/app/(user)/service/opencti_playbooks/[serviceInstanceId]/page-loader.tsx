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
  const { search, labels, setSearch } = useServiceListStorage(
    ServiceListStorageKey.OpenCTIPlaybooks
  );
  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_PLAYBOOKS,
    labels,
  });

  return (
    <ShareableResourceServiceList
      serviceInstance={serviceInstance}
      logicalFilters={logicalFilters}
      search={search}
      onSearchChange={setSearch}
      type={ShareableResourceType.OPENCTI_PLAYBOOK}
      storageKey={ServiceListStorageKey.OpenCTIPlaybooks}
    />
  );
};

export default PageLoader;
