import {
  FeatureFlag,
  IntegrationType,
  Resolvers,
  ShareableResource,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import { isFeatureEnabled } from '../../../../utils/feature-flag.util';

const resolvers: Resolvers = {
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
  Connector: {
    // Legacy connectors carry the OpenCTI version they need in `product_version`,
    // decoupled ones (tags) in `minimum_deployable_version`. The front only
    // reads `product_version`, so it is resolved here according to the flag.
    product_version: ({ product_version, minimum_deployable_version }) =>
      isFeatureEnabled(FeatureFlag.DecouplingConnectors)
        ? (minimum_deployable_version ?? product_version ?? null)
        : (product_version ?? null),
  },
};

export default resolvers;
