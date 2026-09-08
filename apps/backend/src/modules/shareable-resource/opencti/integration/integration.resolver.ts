import {
  IntegrationType,
  Resolvers,
  ShareableResource,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';

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
    // Decoupled (V2) connectors don't carry product_version metadata, only
    // minimum_deployable_version, which represents the same "required OpenCTI
    // platform version" compatibility concept. Fall back to it so the version
    // filter and the card display keep working for those connectors.
    product_version: ({ product_version, minimum_deployable_version }) =>
      product_version ?? minimum_deployable_version ?? null,
  },
};

export default resolvers;
