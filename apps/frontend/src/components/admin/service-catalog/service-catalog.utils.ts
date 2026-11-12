import { ADMIN_SERVICE_CATALOG_PATH } from '@/utils/path/constant';

export enum ServiceCatalogTab {
  Services = 'services',
  SolutionCategories = 'solution-categories',
  UseCases = 'use-cases',
}

export const SERVICE_CATALOG_TAB_PARAM = 'tab';

export const getServiceCatalogTab = (value: string | null): ServiceCatalogTab =>
  Object.values(ServiceCatalogTab).find((tab) => tab === value) ??
  ServiceCatalogTab.Services;

export const getServiceCatalogTabPath = (tab: ServiceCatalogTab): string =>
  `${ADMIN_SERVICE_CATALOG_PATH}?${SERVICE_CATALOG_TAB_PARAM}=${tab}`;
