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
import { OpenctiVersionFilter } from '@/components/ui/shareable-resource/OpenctiVersionFilter';
import { ProductVersionFilter } from '@/components/ui/shareable-resource/ProductVersionFilter';
import { useIsFeatureEnabled } from '@/hooks/use-is-feature-enabled';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { documentsQuery } from '@generated/documentsQuery.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { FeatureFlag, PlatformIdentifier } from '@graphql/generated';
import { PreloadedQuery } from 'react-relay';

interface IntegrationsListProps {
  queryRef: PreloadedQuery<documentsQuery>;
  serviceInstance: serviceInstance_fragment$data;
  search: string;
  onSearchChange: (v: string) => void;
}

const IntegrationsList = ({
  queryRef,
  serviceInstance,
  search,
  onSearchChange,
}: IntegrationsListProps) => {
  const {
    removeIntegrationTypes,
    removeProductVersions,
    removeOpenctiVersions,
    removeLicenseTypes,
    removeSolutionCategories,
    removeDeployable,
    removeVerified,
    localStorageKey,
  } = useIntegrationListStorage();
  const isDecouplingConnectorsEnabled = useIsFeatureEnabled(
    FeatureFlag.DecouplingConnectors
  );

  const additionalFilters: ServiceListFilterMap = {
    [ServiceListFilterKey.IntegrationType]: {
      node: <IntegrationFilters />,
      reset: () => {
        removeIntegrationTypes();
      },
    },
    ...(isDecouplingConnectorsEnabled
      ? {
          [ServiceListFilterKey.OpenctiVersion]: {
            node: (
              <OpenctiVersionFilter
                platformIdentifier={PlatformIdentifier.Opencti}
              />
            ),
            reset: removeOpenctiVersions,
          },
        }
      : {
          [ServiceListFilterKey.ProductVersion]: {
            node: (
              <ProductVersionFilter
                platformIdentifier={PlatformIdentifier.Opencti}
              />
            ),
            reset: removeProductVersions,
          },
        }),
    [ServiceListFilterKey.ManagerSupported]: {
      node: <IntegrationDeployableFilter />,
      reset: removeDeployable,
    },
    [ServiceListFilterKey.Verified]: {
      node: <IntegrationVerifiedFilter />,
      reset: removeVerified,
    },
    [ServiceListFilterKey.SolutionCategory]: {
      node: <IntegrationSolutionCategoryFilter />,
      reset: removeSolutionCategories,
    },
    [ServiceListFilterKey.LicenseType]: {
      node: <IntegrationLicenseTypeFilter />,
      reset: removeLicenseTypes,
    },
  };

  return (
    <ShareableResourceServiceList
      queryRef={queryRef}
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
