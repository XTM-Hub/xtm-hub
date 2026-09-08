'use client';

import IntegrationsList from '@/components/service/integrations/[serviceInstanceId]/IntegrationsList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { useIntegrationListUrlFilters } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-url-filters';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
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
  const {
    pageSize,
    search,
    labels,
    integrationTypes,
    productVersions,
    licenseTypes,
    solutionCategories,
    setSearch,
    deployable,
    verified,
    orderBy,
    orderMode,
    resetAll,
    filters,
    setFilters,
  } = useIntegrationListStorage();

  useIntegrationListUrlFilters({
    filters,
    resetAll,
    setFilters,
  });

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

  const { queryRef, queryRefFacet } = useShareableResourceQueryLoader({
    pageSize,
    orderBy,
    orderMode,
    serviceInstanceId: serviceInstance.id,
    searchTerm: search,
    logicalFilters,
    documentType: ShareableResourceType.OPENCTI_INTEGRATION,
  });

  return (
    <>
      {queryRef && queryRefFacet ? (
        <IntegrationsList
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

// Component export
export default PageLoader;
