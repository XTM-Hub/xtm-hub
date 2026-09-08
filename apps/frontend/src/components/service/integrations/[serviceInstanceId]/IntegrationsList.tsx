import {
  ServiceListFilterKey,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import ShareableResourceServiceList from '@/components/service/components/ShareableResourceServiceList';
import { useIntegrationListStorage } from '@/components/service/integrations/[serviceInstanceId]/use-integration-list-storage';
import { IntegrationDeployableFilter } from '@/components/ui/shareable-resource/integration/IntegrationDeployableFilter';
import { IntegrationFilters } from '@/components/ui/shareable-resource/integration/IntegrationFilters';
import { IntegrationLicenseTypeFilter } from '@/components/ui/shareable-resource/integration/IntegrationLicenseTypeFilter';
import { IntegrationSolutionCategoryFilter } from '@/components/ui/shareable-resource/integration/IntegrationSolutionCategoryFilter';
import { IntegrationVerifiedFilter } from '@/components/ui/shareable-resource/integration/IntegrationVerifiedFilter';
import { ProductVersionFilter } from '@/components/ui/shareable-resource/ProductVersionFilter';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentFacets } from '@generated/documentFacets.graphql';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { PreloadedQuery } from 'react-relay';

interface IntegrationsListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  queryRefFacet: PreloadedQuery<documentFacets>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const IntegrationsList = ({
  queryRef,
  queryRefFacet,
  serviceInstance,
  search,
  onSearchChange,
}: IntegrationsListProps) => {
  const { localStorageKey } = useIntegrationListStorage();

  const additionalFilters: ServiceListFilterMap = {
    [ServiceListFilterKey.IntegrationType]: {
      node: <IntegrationFilters />,
    },
    [ServiceListFilterKey.ProductVersion]: {
      node: (
        <ProductVersionFilter platformIdentifier={PlatformIdentifier.Opencti} />
      ),
    },
    [ServiceListFilterKey.ManagerSupported]: {
      node: <IntegrationDeployableFilter />,
    },
    [ServiceListFilterKey.Verified]: {
      node: <IntegrationVerifiedFilter />,
    },
    [ServiceListFilterKey.SolutionCategory]: {
      node: <IntegrationSolutionCategoryFilter />,
    },
    [ServiceListFilterKey.LicenseType]: {
      node: <IntegrationLicenseTypeFilter />,
    },
  };

  return (
    <ShareableResourceServiceList
      queryRef={queryRef}
      queryRefFacet={queryRefFacet}
      serviceInstance={serviceInstance}
      search={search}
      onSearchChange={onSearchChange}
      type={ShareableResourceType.OPENCTI_INTEGRATION}
      localStorageKey={localStorageKey}
      additionalFilters={additionalFilters}
    />
  );
};

export default IntegrationsList;
