export enum ServiceListStorageKey {
  OpenCTICustomDashboards = 'OpenCTICustomDashboards',
  OpenCTICustomViews = 'OpenCTICustomViews',
  OpenCTIIntegrationFeeds = 'OpenCTIIntegrationFeeds',
  OpenAEVScenarios = 'OpenAEVScenarios',
  OpenCTIPlaybooks = 'OpenCTIPlaybooks',
}

export const USER_LIST_ORGANIZATION_FILTER_KEY = 'organizationFilterUserList';

const SERVICE_LIST_FILTER_NAMES = [
  'search',
  'label',
  'integrationType',
  'productVersion',
  'licenseType',
  'solutionCategory',
  'entityType',
  'deployable',
  'verified',
];

export const buildServiceListStorageKey = (
  name: string,
  isPublicPath: boolean,
  serviceName: ServiceListStorageKey
) => `${name}${isPublicPath ? 'Public' : 'Private'}${serviceName}List`;

const FILTER_STORAGE_KEYS = [
  USER_LIST_ORGANIZATION_FILTER_KEY,
  ...Object.values(ServiceListStorageKey).flatMap((serviceName) =>
    SERVICE_LIST_FILTER_NAMES.flatMap((name) => [
      buildServiceListStorageKey(name, true, serviceName),
      buildServiceListStorageKey(name, false, serviceName),
    ])
  ),
];

const removeFilterEntries = (getStorage: () => Storage) => {
  try {
    const storage = getStorage();
    for (const key of FILTER_STORAGE_KEYS) {
      storage.removeItem(key);
    }
  } catch {
    // Blocked browser storage must not prevent page initialization or logout.
  }
};

export const clearFiltersStorage = () => {
  removeFilterEntries(() => window.sessionStorage);
};

// Filters moved from localStorage to sessionStorage: drop what older versions left behind.
export const removeLegacyFiltersLocalStorage = () => {
  removeFilterEntries(() => window.localStorage);
};
