'use client';
import { PublicDocumentListQuery } from '@/components/service/document/public-document.graphql';
import PublicDocumentsList from '@/components/service/document/PublicDocumentsList';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LogicalFiltersParams,
  useLogicalFiltersFromStorage,
} from '@/hooks/use-logical-filters-from-storage';
import { useServiceListStorage } from '@/hooks/use-service-list-storage';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { useShareableResourceMapping } from '@/utils/shareable-resources/use-shareable-resource-mapping';
import { publicDocumentsQuery } from '@generated/publicDocumentsQuery.graphql';
import { SeoServiceInstanceItemFragment } from '@graphql/generated';
import { useEffect } from 'react';
import { useQueryLoader } from 'react-relay';

interface PublicDocumentListPageLoaderProps {
  serviceInstance: SeoServiceInstanceItemFragment;
  baseUrl: string;
}

export const PublicDocumentListPageLoader = ({
  serviceInstance,
  baseUrl,
}: PublicDocumentListPageLoaderProps) => {
  const [queryRef, loadQuery] = useQueryLoader<publicDocumentsQuery>(
    PublicDocumentListQuery
  );

  const serviceInstanceSlug = serviceInstance.slug as ServiceSlug;
  const { storageKey } = useShareableResourceMapping(serviceInstanceSlug);

  const {
    pageSize,
    search,
    labels,
    entityTypes,
    integrationTypes,
    deployable,
    verified,
    productVersions,
    licenseTypes,
    solutionCategories,
    orderMode,
    orderBy,
  } = useServiceListStorage(storageKey);
  const params: LogicalFiltersParams =
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS
      ? {
          serviceInstanceSlug:
            serviceInstanceSlug as ServiceSlug.OPEN_CTI_INTEGRATIONS,
          labels,
          deployable,
          verified,
          integrationTypes,
          productVersions,
          licenseTypes,
          solutionCategories,
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
        />
      ) : (
        <Skeleton className="w-full inset-1/2" />
      )}
    </>
  );
};
