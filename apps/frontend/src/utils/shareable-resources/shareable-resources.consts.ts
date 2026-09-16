import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { IntegrationType } from '@graphql/generated';

export const OPENCTI_INTEGRATION_URL_CONFIGS: Partial<
  Record<IntegrationType, string>
> = {
  [IntegrationType.TaxiiFeed]: 'deploy-taxii-feed',
  [IntegrationType.CsvFeed]: 'deploy-csv-feed',
  [IntegrationType.Stream]: 'deploy-sync',
  [IntegrationType.RssFeed]: 'deploy-rss-feed',
};

export interface ServiceConfig {
  redirectPath: string;
  description: string;
}

export const serviceConfigMap: Record<ServiceSlug, ServiceConfig> = {
  [ServiceSlug.OPEN_CTI_INTEGRATIONS]: {
    redirectPath: 'opencti_integrations',
    description:
      '. Discover more OpenCTI integrations like this in our OpenCTI Integrations Library, available for download on the XTM Hub.',
  },
  [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]: {
    redirectPath: 'opencti_custom_dashboards',
    description:
      '. Discover more dashboards like this in our OpenCTI Custom Dashboards Library, available for download on the XTM Hub.',
  },
  [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]: {
    redirectPath: 'opencti_custom_views',
    description:
      '. Discover more custom views like this in our OpenCTI Custom Views Library, available for download on the XTM Hub.',
  },
  [ServiceSlug.OPEN_AEV_SCENARIOS]: {
    redirectPath: 'openaev_scenarios',
    description:
      '. Discover more widgets like this in our OpenAEV Scenarios Library, available for download on the XTM Hub.',
  },
  [ServiceSlug.OPEN_CTI_PLAYBOOKS]: {
    redirectPath: 'opencti_playbooks',
    description:
      '. Discover more playbooks like this in our OpenCTI Playbook Library, available for download on the XTM Hub.',
  },
};

export const localeMap: Record<ServiceSlug, string> = {
  [ServiceSlug.OPEN_CTI_INTEGRATIONS]: 'OpenctiIntegrations',
  [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]: 'OpenctiCustomDashboards',
  [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]: 'OpenctiCustomViews',
  [ServiceSlug.OPEN_AEV_SCENARIOS]: 'OpenAEVScenario',
  [ServiceSlug.OPEN_CTI_PLAYBOOKS]: 'OpenCTIPlaybook',
};
