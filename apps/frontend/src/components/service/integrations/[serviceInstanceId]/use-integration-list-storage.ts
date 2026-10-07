'use client';

import {
  AllFilters,
  CONNECTOR_TYPE_PARAM,
  DEPLOYABLE_PARAM,
  INTEGRATION_TYPE_PARAM,
  LABEL_PARAM,
  LICENSE_TYPE_PARAM,
  PRODUCT_VERSION_PARAM,
  SOLUTION_CATEGORY_PARAM,
  VERIFIED_PARAM,
} from '@/components/service/integrations/[serviceInstanceId]/integration-list-url-filters.utils';
import {
  ServiceListLocalStorageKey,
  useServiceListLocalStorage,
} from '@/hooks/use-service-list-local-storage';
import { useCallback, useMemo } from 'react';

export const useIntegrationListStorage = () => {
  const localStorageKey = ServiceListLocalStorageKey.OpenCTIIntegrationFeeds;
  const store = useServiceListLocalStorage(localStorageKey);

  const {
    integrationTypes,
    labels,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
    connectorTypes,
    setIntegrationTypes,
    setLabels,
    setDeployable,
    setVerified,
    setProductVersions,
    setLicenseTypes,
    setSolutionCategories,
    setConnectorTypes,
  } = store;

  const filters = useMemo<AllFilters>(
    () => ({
      [INTEGRATION_TYPE_PARAM]: integrationTypes,
      [LABEL_PARAM]: labels,
      [DEPLOYABLE_PARAM]: deployable,
      [VERIFIED_PARAM]: verified,
      [PRODUCT_VERSION_PARAM]: productVersions,
      [LICENSE_TYPE_PARAM]: licenseTypes,
      [SOLUTION_CATEGORY_PARAM]: solutionCategories,
      [CONNECTOR_TYPE_PARAM]: connectorTypes,
    }),
    [
      integrationTypes,
      labels,
      deployable,
      verified,
      productVersions,
      licenseTypes,
      solutionCategories,
      connectorTypes,
    ]
  );

  const setFilters = useCallback(
    (value: AllFilters) => {
      setIntegrationTypes(value[INTEGRATION_TYPE_PARAM] ?? {});
      setLabels(value[LABEL_PARAM] ?? {});
      setDeployable(value[DEPLOYABLE_PARAM] ?? {});
      setVerified(value[VERIFIED_PARAM] ?? {});
      setProductVersions(value[PRODUCT_VERSION_PARAM] ?? {});
      setLicenseTypes(value[LICENSE_TYPE_PARAM] ?? {});
      setSolutionCategories(value[SOLUTION_CATEGORY_PARAM] ?? {});
      setConnectorTypes(value[CONNECTOR_TYPE_PARAM] ?? {});
    },
    [
      setIntegrationTypes,
      setLabels,
      setDeployable,
      setVerified,
      setProductVersions,
      setLicenseTypes,
      setSolutionCategories,
      setConnectorTypes,
    ]
  );

  return { ...store, filters, setFilters, localStorageKey };
};
