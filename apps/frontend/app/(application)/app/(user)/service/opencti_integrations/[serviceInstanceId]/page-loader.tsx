'use client';

import IntegrationsList from '@/components/service/integrations/[serviceInstanceId]/IntegrationsList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { useIntegrationListUrlFilters } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-url-filters';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import { useShareableResourceQueryLoader } from '@/hooks/use-shareable-resource-query-loader';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { Skeleton } from '@filigran/ui';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { FeatureFlag } from '@graphql/generated';

// Stable reference so the `productVersions` filter fed into
// useLogicalFiltersFromStorage() keeps the same identity across renders when
// DECOUPLING_CONNECTORS is enabled. A fresh `{}` literal would recompute
// logicalFilters on every render, re-trigger useShareableResourceQueryLoader's
// loadQuery effect indefinitely, and crash with "Maximum update depth exceeded".
const EMPTY_PRODUCT_VERSIONS = {};

interface PageLoaderProps {
  serviceInstance: serviceInstance_fragment$data;
}

const PageLoader = ({ serviceInstance }: PageLoaderProps) => {
  const {
    pageSize,
    search,
    labels,
    integrationTypes,
    licenseTypes,
    solutionCategories,
    productVersions,
    setSearch,
    deployable,
    verified,
    orderBy,
    orderMode,
    resetAll,
    filters,
    setFilters,
    setSelectedFilters,
  } = useIntegrationListStorage();
  // The OpenCTI version filter only excludes non-compatible connectors on
  // the backend when DECOUPLING_CONNECTORS is disabled. When it's enabled,
  // OpenctiVersionFilter drives the grey-out client-side instead, so no
  // product_version value must be sent to the backend query.
  const isDecouplingConnectorsEnabled = useIsFeatureEnabled(
    FeatureFlag.DecouplingConnectors
  );

  useIntegrationListUrlFilters({
    filters,
    resetAll,
    setFilters,
    setSelectedFilters,
  });

  const logicalFilters = useLogicalFiltersFromStorage({
    serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
    labels,
    deployable,
    verified,
    integrationTypes,
    licenseTypes,
    solutionCategories,
    productVersions: isDecouplingConnectorsEnabled
      ? EMPTY_PRODUCT_VERSIONS
      : productVersions,
  });

  const queryRef = useShareableResourceQueryLoader({
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
        <IntegrationsList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
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
