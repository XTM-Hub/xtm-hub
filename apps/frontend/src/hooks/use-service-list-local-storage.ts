import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import {
  isLogicalMultiSelectSelection,
  LogicalMultiSelectSelection,
} from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import usePublicPath from '@/hooks/use-public-path';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export enum ServiceListLocalStorageKey {
  OpenCTICustomDashboards = 'OpenCTICustomDashboards',
  OpenCTICustomViews = 'OpenCTICustomViews',
  OpenCTIIntegrationFeeds = 'OpenCTIIntegrationFeeds',
  OpenAEVScenarios = 'OpenAEVScenarios',
  OpenCTIPlaybooks = 'OpenCTIPlaybooks',
}

const deserializeLogicalMultiSelectSelection = (
  stored: string
): LogicalMultiSelectSelection => {
  try {
    const parsed = JSON.parse(stored);

    if (isLogicalMultiSelectSelection(parsed)) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
};

export const useServiceListLocalStorage = (
  serviceName: ServiceListLocalStorageKey
) => {
  const isPublicPath = usePublicPath();
  const pagePrefix = isPublicPath ? 'Public' : 'Private';
  const [search, setSearch, removeSearch] = useLocalStorage<string>(
    `search${pagePrefix}${serviceName}List`,
    ''
  );

  const [labels, setLabels, removeLabels] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `label${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [integrationTypes, setIntegrationTypes, removeIntegrationTypes] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `integrationType${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [productVersions, setProductVersions, removeProductVersions] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `productVersion${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [licenseTypes, setLicenseTypes, removeLicenseTypes] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `licenseType${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [solutionCategories, setSolutionCategories, removeSolutionCategories] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `solutionCategory${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [entityTypes, setEntityTypes, removeEntityTypes] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `entityType${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [deployable, setDeployable, removeDeployable] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `deployable${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [verified, setVerified, removeVerified] =
    useLocalStorage<LogicalMultiSelectSelection>(
      `verified${pagePrefix}${serviceName}List`,
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    `pageSize${pagePrefix}${serviceName}List`,
    50
  );

  const defaultOrderBy =
    serviceName === ServiceListLocalStorageKey.OpenCTIIntegrationFeeds
      ? DocumentOrdering.Name
      : DocumentOrdering.CreatedAt;

  const [orderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<DocumentOrdering>(
      `orderBy${pagePrefix}${serviceName}List`,
      defaultOrderBy
    );

  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>(
      `orderMode${pagePrefix}${serviceName}List`,
      OrderingMode.Asc
    );
  const [displayMode, setDisplayMode, removeDisplayMode] =
    useLocalStorage<ServiceListDisplayMode>(
      `displayMode${pagePrefix}${serviceName}List`,
      ServiceListDisplayMode.Tab
    );

  const resetAll = useCallback(() => {
    removePageSize();
    removeSearch();
    removeLabels();
    removeIntegrationTypes();
    removeProductVersions();
    removeLicenseTypes();
    removeSolutionCategories();
    removeEntityTypes();
    removeDeployable();
    removeVerified();
    removeOrderBy();
    removeOrderMode();
    removeDisplayMode();
  }, [
    removePageSize,
    removeSearch,
    removeLabels,
    removeIntegrationTypes,
    removeProductVersions,
    removeLicenseTypes,
    removeSolutionCategories,
    removeEntityTypes,
    removeDeployable,
    removeVerified,
    removeOrderBy,
    removeOrderMode,
    removeDisplayMode,
  ]);

  return {
    pageSize,
    setPageSize,
    resetAll,
    search,
    setSearch,
    removeSearch,
    labels,
    setLabels,
    removeLabels,
    integrationTypes,
    setIntegrationTypes,
    removeIntegrationTypes,
    productVersions,
    setProductVersions,
    removeProductVersions,
    licenseTypes,
    setLicenseTypes,
    removeLicenseTypes,
    solutionCategories,
    setSolutionCategories,
    removeSolutionCategories,
    entityTypes,
    setEntityTypes,
    removeEntityTypes,
    deployable,
    setDeployable,
    removeDeployable,
    verified,
    setVerified,
    removeVerified,
    orderBy,
    setOrderBy,
    orderMode,
    setOrderMode,
    displayMode,
    setDisplayMode,
  };
};
