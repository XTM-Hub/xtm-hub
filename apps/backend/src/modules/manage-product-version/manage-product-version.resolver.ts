import {
  ManifestType,
  MutationResolvers,
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { Guarded, Public } from '../../security/guarded/guarded.decorator';
import { callerGuard } from '../../security/guarded/guards/caller.guard';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { BadRequestError } from '../../utils/error/error.util';
import { isLtsVersion, isValidVersion } from '../../utils/versioning';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
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
    ManifestFragmentHelper.validateProductVersion(version);
    // isLtsVersion only reads a lowercase suffix: -LTS.8 would be routed as non-LTS
    if (!isValidVersion(version)) {
      throw BadRequestError(BadRequestErrorCode.InvalidPlatformVersion, {
        detail: `Invalid version format: ${version}`,
      });
    }

    // An LTS version gets neither a manifest nor a registration: it would pollute the version filter of the libraries
    if (!isLtsVersion(version)) {
      await ManifestApp.requestManifestGeneration({
        product,
        version,
        type: ManifestType.Connector,
      });

      await ManageProductVersionApp.registerProductVersion({
        product,
        version,
      });
    }

    void NewsFeedApp.createGithubReleaseNewsFeedItem({
      product,
      version,
    }).catch((error) =>
      logApp.error('Unable to create the GitHub release news feed item', {
        error,
        product,
        version,
      })
    );

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
