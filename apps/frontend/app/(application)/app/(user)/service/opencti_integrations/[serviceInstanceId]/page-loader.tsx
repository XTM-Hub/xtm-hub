'use client';

import { IntegrationListUrlFiltersSync } from '@/components/service/integrations/[serviceInstanceId]/IntegrationListUrlFiltersSync';
import IntegrationsList from '@/components/service/integrations/[serviceInstanceId]/IntegrationsList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const {
    search,
    labels,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
    setSearch,
    deployable,
    verified,
  } = useIntegrationListStorage();

  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
    labels,
    deployable,
    verified,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
  });

  return (
    <>
      <IntegrationListUrlFiltersSync />
      <IntegrationsList
        serviceInstance={serviceInstance}
        logicalFilters={logicalFilters}
        search={search}
        onSearchChange={setSearch}
      />
    </>
  );
};

// Component export
export default PageLoader;
