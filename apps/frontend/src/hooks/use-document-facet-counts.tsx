import { toServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { LogicalMultiSelectSelection } from '@/components/ui/shareable-resource/logical-multi-select/LogicalMultiSelectFormField';
import { useLogicalFiltersFromStorage } from '@/hooks/use-logical-filters-from-storage';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { LogicalFilterInput, useDocumentFacetsQuery } from '@graphql/generated';
import { keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface UseDocumentFacetCountsParams {
  serviceInstanceId: string;
  documentType: string;
  search: string;
  serviceInstanceSlug: ServiceSlug;
  labels: LogicalMultiSelectSelection;
  entityTypes: LogicalMultiSelectSelection;
  deployable: LogicalMultiSelectSelection;
  verified: LogicalMultiSelectSelection;
  integrationTypes: LogicalMultiSelectSelection;
  productVersions: LogicalMultiSelectSelection;
  licenseTypes: LogicalMultiSelectSelection;
  solutionCategories: LogicalMultiSelectSelection;
}

export const useDocumentFacetCounts = ({
  serviceInstanceId,
  documentType,
  search,
  serviceInstanceSlug,
  labels,
  entityTypes,
  deployable,
  verified,
  integrationTypes,
  productVersions,
  licenseTypes,
  solutionCategories,
}: UseDocumentFacetCountsParams) => {
  const logicalFilters = useLogicalFiltersFromStorage(
    serviceInstanceSlug === ServiceSlug.OPEN_CTI_INTEGRATIONS
      ? {
          serviceInstanceSlug: ServiceSlug.OPEN_CTI_INTEGRATIONS,
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
        }
  );

  const { data: facetData } = useDocumentFacetsQuery(
    portalGraphqlClient,
    {
      input: {
        serviceInstanceId,
        documentType,
        searchTerm: search,
        logicalFilters: logicalFilters as LogicalFilterInput,
      },
    },
    { placeholderData: keepPreviousData }
  );

  return useMemo(
    () =>
      facetData === undefined
        ? undefined
        : toServiceListFacetCounts(facetData.documentFacets),
    [facetData]
  );
};
