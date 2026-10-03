import {
  IntegrationType,
  Resolvers,
  ShareableResource,
} from '../../../../__generated__/resolvers-types';
import { logApp } from '../../../../utils/app-logger.util';
import { IntegrationCoverageHelper } from './integration-coverage/integration-coverage.helper';

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
    // Hydrated from Document_Metadata as JSON strings, see integration-coverage.helper.ts
    covered_object_types: ({ covered_object_types }) =>
      IntegrationCoverageHelper.parseStoredList(covered_object_types),
    covered_sectors: ({ covered_sectors }) =>
      IntegrationCoverageHelper.parseStoredList(covered_sectors),
    covered_regions: ({ covered_regions }) =>
      IntegrationCoverageHelper.parseStoredList(covered_regions),
    coverage_inferred: ({ coverage_inferred }) =>
      IntegrationCoverageHelper.parseCoverageInferred(coverage_inferred),
  },
};

export default resolvers;
