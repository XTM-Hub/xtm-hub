import { ServiceListDisplayMode } from '@/components/service/components/header/ServiceListHeader';
import {
  isLogicalMultiSelectSelection,
  LogicalMultiSelectSelection,
} from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import usePublicPath from '@/hooks/use-public-path';
import {
  buildServiceListStorageKey,
  ServiceListStorageKey,
  ServiceListStorageName,
} from '@/utils/filters-storage.utils';
import { DocumentOrdering, OrderingMode } from '@graphql/generated';
import { useCallback } from 'react';
import { useLocalStorage, useSessionStorage } from 'usehooks-ts';

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

export const useServiceListStorage = (serviceName: ServiceListStorageKey) => {
  const isPublicPath = usePublicPath();
  const buildKey = (name: ServiceListStorageName) =>
    buildServiceListStorageKey(name, isPublicPath, serviceName);

  const [search, setSearch, removeSearch] = useSessionStorage<string>(
    buildKey('search'),
    ''
  );

  const [labels, setLabels, removeLabels] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('label'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [integrationTypes, setIntegrationTypes, removeIntegrationTypes] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('integrationType'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [productVersions, setProductVersions, removeProductVersions] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('productVersion'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [licenseTypes, setLicenseTypes, removeLicenseTypes] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('licenseType'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [solutionCategories, setSolutionCategories, removeSolutionCategories] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('solutionCategory'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [entityTypes, setEntityTypes, removeEntityTypes] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('entityType'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [deployable, setDeployable, removeDeployable] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('deployable'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [verified, setVerified, removeVerified] =
    useSessionStorage<LogicalMultiSelectSelection>(
      buildKey('verified'),
      {},
      {
        deserializer: deserializeLogicalMultiSelectSelection,
      }
    );

  const [pageSize, setPageSize, removePageSize] = useLocalStorage(
    buildKey('pageSize'),
    50
  );

  const defaultOrderBy =
    serviceName === ServiceListStorageKey.OpenCTIIntegrationFeeds
      ? DocumentOrdering.Name
      : DocumentOrdering.CreatedAt;

  const [orderBy, setOrderBy, removeOrderBy] =
    useLocalStorage<DocumentOrdering>(buildKey('orderBy'), defaultOrderBy);

  const [orderMode, setOrderMode, removeOrderMode] =
    useLocalStorage<OrderingMode>(buildKey('orderMode'), OrderingMode.Asc);
  const [displayMode, setDisplayMode, removeDisplayMode] =
    useLocalStorage<ServiceListDisplayMode>(
      buildKey('displayMode'),
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
