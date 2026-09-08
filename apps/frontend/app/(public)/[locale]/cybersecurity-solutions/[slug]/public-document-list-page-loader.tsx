'use client';
import { PublicDocumentListQuery } from '@/components/service/document/public-document.graphql';
import PublicDocumentsList from '@/components/service/document/PublicDocumentsList';
import {
  LogicalFiltersParams,
  useLogicalFiltersFromStorage,
} from '@/hooks/use-logical-filters-from-storage';
import { useServiceListLocalStorage } from '@/hooks/use-service-list-local-storage';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { Skeleton } from '@filigran/ui';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { useEffect } from 'react';
import { useQueryLoader } from 'react-relay';

const EMPTY_PRODUCT_VERSIONS = {};

interface PublicDocumentListPageLoaderProps {
  serviceInstance: seoServiceInstanceFragment$data;
  baseUrl: string;
  /**
   * Resolved server-side (see settings.service.ts:isFeatureEnabled) since
   * public pages never mount SettingsContext for useIsFeatureEnabled to read.
   */
  isDecouplingConnectorsEnabled: boolean;
}

export const PublicDocumentListPageLoader = ({
  serviceInstance,
  baseUrl,
  isDecouplingConnectorsEnabled,
}: PublicDocumentListPageLoaderProps) => {
  const [queryRef, loadQuery] = useQueryLoader<publicDocumentsQuery>(
    PublicDocumentListQuery
  );

  const serviceInstanceSlug = serviceInstance.slug as ServiceSlug;
  const { localStorageKey } = useShareableResourceMapping(
    serviceInstanceSlug,
    isDecouplingConnectorsEnabled
  );
  // The OpenCTI version filter only excludes non-compatible connectors on
  // the backend when DECOUPLING_CONNECTORS is disabled. When it's enabled,
  // OpenctiVersionFilter drives the grey-out client-side instead, so no
  // product_version value must be sent to the backend query.

  const {
    pageSize,
    search,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    licenseTypes,
    solutionCategories,
    productVersions,
    orderMode,
    orderBy,
  } = useServiceListLocalStorage(localStorageKey);
  const params: LogicalFiltersParams =
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS
      ? {
          serviceInstanceSlug:
            serviceInstanceSlug as ServiceSlug.OPEN_CTI_INTEGRATIONS,
          labels,
          deployable,
          verified,
          integrationTypes,
          licenseTypes,
          solutionCategories,
          productVersions: isDecouplingConnectorsEnabled
            ? EMPTY_PRODUCT_VERSIONS
            : productVersions,
        }
      : {
          serviceInstanceSlug: serviceInstanceSlug as
            | ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS
            | ServiceSlug.OPEN_AEV_SCENARIOS
            | ServiceSlug.OPEN_CTI_PLAYBOOKS
            | ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
          labels,
          entityTypes,
        };

  const logicalFilters = useLogicalFiltersFromStorage(params);

  useEffect(() => {
    loadQuery(
      {
        slug: serviceInstance.slug ?? '',
        count: pageSize,
        orderBy,
        orderMode,
        serviceInstanceId: serviceInstance.id,
        searchTerm: search,
        logicalFilters,
      },
      {
        fetchPolicy: 'store-and-network',
      }
    );
  }, [
    loadQuery,
    pageSize,
    serviceInstance,
    search,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    logicalFilters,
    orderMode,
    orderBy,
  ]);

  return (
    <>
      {queryRef ? (
        <PublicDocumentsList
          serviceInstance={serviceInstance}
          queryRef={queryRef}
          baseUrl={baseUrl}
          isDecouplingConnectorsEnabled={isDecouplingConnectorsEnabled}
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};
