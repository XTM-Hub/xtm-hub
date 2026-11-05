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

export const localeMap: Record<ServiceSlug, string> = {
  [ServiceSlug.OPEN_CTI_INTEGRATIONS]: 'OpenctiIntegrations',
  [ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS]: 'OpenctiCustomDashboards',
  [ServiceSlug.OPEN_CTI_CUSTOM_VIEWS]: 'OpenctiCustomViews',
  [ServiceSlug.OPEN_AEV_SCENARIOS]: 'OpenAEVScenario',
  [ServiceSlug.OPEN_CTI_PLAYBOOKS]: 'OpenCTIPlaybook',
};
