import { IntegrationType } from '@graphql/generated';

export const availableIntegrationTypes: IntegrationType[] = [
  IntegrationType.TaxiiFeed,
  IntegrationType.RssFeed,
  IntegrationType.Connector,
  IntegrationType.CsvFeed,
  IntegrationType.Stream,
  IntegrationType.ThirdPartyIntegration,
];
