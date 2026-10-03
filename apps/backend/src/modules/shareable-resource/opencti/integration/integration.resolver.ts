import {
  IntegrationType,
  Resolvers,
  ShareableResource,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import { ConnectorTypeHelper } from './connector-type.helper';

type ConnectorTypeSource = {
  image_type?: string | null;
  config_schema?: string | null;
};

const resolvers: Resolvers = {
  Connector: {
    connector_type: (connector) =>
      ConnectorTypeHelper.normalize(
        (connector as ConnectorTypeSource).image_type
      ) ?? null,
    hunt_platform: (connector) =>
      ConnectorTypeHelper.resolveHuntPlatform(connector as ConnectorTypeSource),
  },
  Integration: {
    __resolveType(feed) {
      const mapping = {
        [IntegrationType.Connector]: 'Connector',
        [IntegrationType.CsvFeed]: 'CsvFeed',
        [IntegrationType.TaxiiFeed]: 'TaxiiFeed',
        [IntegrationType.RssFeed]: 'RssFeed',
        [IntegrationType.Stream]: 'Stream',
        [IntegrationType.ThirdPartyIntegration]: 'ThirdPartyIntegration',
      } as const;

      const resolvedType =
        mapping[feed.integration_type as keyof typeof mapping];
      if (!resolvedType) {
        logApp.error(
          `Unknown resolve type for integration ${feed.id} and integration type ${feed.integration_type}`
        );
      }

      return resolvedType;
    },
    solution_categories: ({ id }, _, context) =>
      context.dataLoaders.document.solutionCategoriesByDocumentIdLoader.load(
        id
      ),
    children_documents: async ({ id }, _, context) =>
      (await context.dataLoaders.document.imagesByDocumentIdLoader.load(
        id
      )) as unknown as ShareableResource[],
  },
};

export default resolvers;
