import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import { DocumentOrdering, IntegrationType } from '@graphql/generated';

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

export const SORTABLE_DOCUMENT_ORDERINGS = [
  DocumentOrdering.Name,
  DocumentOrdering.CreatedAt,
  DocumentOrdering.UpdatedAt,
] as const;

export type SortableDocumentOrdering =
  (typeof SORTABLE_DOCUMENT_ORDERINGS)[number];
