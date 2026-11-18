import {
  ManifestType,
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { Guarded, Public } from '../../security/guarded/guarded.decorator';
import { callerGuard } from '../../security/guarded/guards/caller.guard';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import { ManageProductVersionApp } from './manage-product-version.app';

class ManageProductVersionQueries {
  @Public()
  static readonly registeredProductVersions: NonNullable<
    QueryResolvers['registeredProductVersions']
  > = (_, { product, search }) =>
    ManageProductVersionApp.loadRegisteredProductVersions(product, search);
}

class ManageProductVersionMutations {
  @Guarded(callerGuard('system', [PortalCapability.GenerateManifest]))
  static readonly newProductVersion: NonNullable<
    MutationResolvers['newProductVersion']
  > = async (_, { product, version }) => {
    await ManifestApp.requestManifestGeneration({
      product,
      version,
      type: ManifestType.Connector,
    });

    await ManageProductVersionApp.registerProductVersion({
      product,
      version,
    });

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
