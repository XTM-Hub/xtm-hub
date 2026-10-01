import { ManifestType, Resolvers } from '../../__generated__/resolvers-types';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import { ManageProductVersionApp } from './manage-product-version.app';

const resolvers: Resolvers = {
  Query: {
    registeredProductVersions: async (_, { product, search }) => {
      return ManageProductVersionApp.loadRegisteredProductVersions(
        product,
        search
      );
    },
  },
  Mutation: {
    newProductVersion: async (_, { product, version }) => {
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
    },
  },
};

export default resolvers;
