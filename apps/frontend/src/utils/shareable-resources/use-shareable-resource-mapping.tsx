'use client';
import { ServiceListFacetCounts } from '@/components/service/components/header/filter/service-list-facet-counts';
import { ServiceListFilterEntityType } from '@/components/service/components/header/filter/ServiceListFilterEntityType';
import { ServiceListFilterLabel } from '@/components/service/components/header/filter/ServiceListFilterLabel';
import {
  ServiceListFilterKey,
  ServiceListFilterMap,
} from '@/components/service/components/header/ServiceListHeader';
import { IntegrationDeployableFilter } from '@/components/ui/shareable-resource/integration/IntegrationDeployableFilter';
import { IntegrationLicenseTypeFilter } from '@/components/ui/shareable-resource/integration/IntegrationLicenseTypeFilter';
import { IntegrationSolutionCategoryFilter } from '@/components/ui/shareable-resource/integration/IntegrationSolutionCategoryFilter';
import { IntegrationTypeFilter } from '@/components/ui/shareable-resource/integration/IntegrationTypeFilter';
import { IntegrationVerifiedFilter } from '@/components/ui/shareable-resource/integration/IntegrationVerifiedFilter';
import { ServiceListLocalStorageKey } from '@/hooks/use-service-list-local-storage';
import {
  ServiceSlug,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { useTranslations } from 'next-intl';

export const useShareableResourceMapping = (
  slug: ServiceSlug,
  facetCounts?: ServiceListFacetCounts
) => {
  const t = useTranslations();
  const localStorageKeyMapping: Record<
    ServiceSlug,
    ServiceListLocalStorageKey
  > = {
    [ServiceSlug.OPEN_CTI_INTEGRATIONS]:
      ServiceListLocalStorageKey.OpenCTIIntegrationFeeds,
    [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]:
      ServiceListLocalStorageKey.OpenCTICustomDashboards,
    [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]:
      ServiceListLocalStorageKey.OpenCTICustomViews,
    [ServiceSlug.OPEN_AEV_SCENARIOS]:
      ServiceListLocalStorageKey.OpenAEVScenarios,
    [ServiceSlug.OPEN_CTI_PLAYBOOKS]:
      ServiceListLocalStorageKey.OpenCTIPlaybooks,
  };
  const localStorageKey = localStorageKeyMapping[slug];
  const typeFeed: Record<ServiceSlug, ShareableResourceType> = {
    [ServiceSlug.OPEN_CTI_INTEGRATIONS]:
      ShareableResourceType.OPENCTI_INTEGRATION,
    [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]:
      ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]:
      ShareableResourceType.OPENCTI_CUSTOM_VIEW,
    [ServiceSlug.OPEN_AEV_SCENARIOS]: ShareableResourceType.OPENAEV_SCENARIO,
    [ServiceSlug.OPEN_CTI_PLAYBOOKS]: ShareableResourceType.OPENCTI_PLAYBOOK,
  };
  const labelFilter = {
    title: t('GenericActions.FilterUseCasesLabel'),
    node: (
      <ServiceListFilterLabel
        type={typeFeed[slug]}
        facetCounts={facetCounts?.useCase}
      />
    ),
  };

  const entityTypeFilter = {
    title: t('GenericActions.FilterEntityTypesLabel'),
    node: <ServiceListFilterEntityType facetCounts={facetCounts?.entityType} />,
  };

  const filtersMap: Record<ServiceSlug, ServiceListFilterMap> = {
    [ServiceSlug.OPEN_CTI_INTEGRATIONS]: {
      [ServiceListFilterKey.Label]: labelFilter,
      [ServiceListFilterKey.IntegrationType]: {
        title: t('Service.OpenctiIntegrations.Filter.Type.Label'),
        node: (
          <IntegrationTypeFilter facetCounts={facetCounts?.integrationType} />
        ),
      },
      [ServiceListFilterKey.ManagerSupported]: {
        title: t('Service.OpenctiIntegrations.Filter.ManagerSupported.Label'),
        node: (
          <IntegrationDeployableFilter
            facetCounts={facetCounts?.managerSupported}
          />
        ),
      },
      [ServiceListFilterKey.Verified]: {
        title: t('Service.OpenctiIntegrations.Filter.Verified.Label'),
        node: <IntegrationVerifiedFilter facetCounts={facetCounts?.verified} />,
      },

      [ServiceListFilterKey.SolutionCategory]: {
        title: t('Service.OpenctiIntegrations.Filter.SolutionCategory.Label'),
        node: (
          <IntegrationSolutionCategoryFilter
            facetCounts={facetCounts?.solutionCategory}
          />
        ),
      },
      [ServiceListFilterKey.LicenseType]: {
        title: t('Service.OpenctiIntegrations.Filter.LicenseType.Label'),
        node: (
          <IntegrationLicenseTypeFilter
            facetCounts={facetCounts?.licenseType}
          />
        ),
      },
    },
    [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]: {
      [ServiceListFilterKey.Label]: labelFilter,
    },
    [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]: {
      [ServiceListFilterKey.Label]: labelFilter,
      [ServiceListFilterKey.EntityType]: entityTypeFilter,
    },
    [ServiceSlug.OPEN_AEV_SCENARIOS]: {
      [ServiceListFilterKey.Label]: labelFilter,
    },
    [ServiceSlug.OPEN_CTI_PLAYBOOKS]: {
      [ServiceListFilterKey.Label]: labelFilter,
    },
  };

  const filters = filtersMap[slug];

  return {
    filters,
    localStorageKey,
  };
};
