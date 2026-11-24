import {
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { Guarded, Public } from '../../security/guarded/guarded.decorator';
import { systemCallerGuard } from '../../security/guarded/guards/caller.guard';
import { ManageProductVersionApp } from './manage-product-version.app';

class ManageProductVersionQueries {
  @Public()
  static readonly registeredProductVersions: NonNullable<
    QueryResolvers['registeredProductVersions']
  > = (_, { product, search }) =>
    ManageProductVersionApp.loadRegisteredProductVersions(product, search);
}

class ManageProductVersionMutations {
  @Guarded(systemCallerGuard([PortalCapability.GenerateManifest]))
  static readonly newProductVersion: NonNullable<
    MutationResolvers['newProductVersion']
  > = async (_, { product, version }) => {
    await ManageProductVersionApp.handleNewProductVersion({ product, version });
    return {
      success: true,
    };
  };
}

const resolvers: Resolvers = {
  Query: { ...ManageProductVersionQueries },
  Mutation: { ...ManageProductVersionMutations },
};

export default resolvers;
