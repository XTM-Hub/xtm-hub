import {
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../../../__generated__/resolvers-types';
import {
  Guarded,
  Public,
} from '../../../../security/guarded/guarded.decorator';
import { portalCapabilityGuard } from '../../../../security/guarded/guards/portal.guard';
import { mapToGraphQLError } from '../../../../utils/error/error.mapping';
import { SeoServiceInstanceApp } from './seo-service-instance.app';

class SeoServiceInstanceQueries {
  // The app filters the rows: the metadata of a hidden instance is for the holders of MODIFY_SERVICE_METADATA only
  @Public()
  static readonly seoServiceInstanceMetadata: NonNullable<
    QueryResolvers['seoServiceInstanceMetadata']
  > = (_, args) => SeoServiceInstanceApp.loadSeoServiceInstancesBy(args);
}

class SeoServiceInstanceMutations {
  @Guarded(portalCapabilityGuard([PortalCapability.ModifyServiceMetadata]))
  static readonly editSeoServiceInstance: NonNullable<
    MutationResolvers['editSeoServiceInstance']
  > = async (_, args) => {
    try {
      return await SeoServiceInstanceApp.editSeoServiceInstanceBy(args);
    } catch (error) {
      throw mapToGraphQLError(error);
    }
  };
}

const resolvers: Resolvers = {
  Query: { ...SeoServiceInstanceQueries },
  Mutation: { ...SeoServiceInstanceMutations },
};

export default resolvers;
