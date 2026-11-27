import {
  ManifestType,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import type ProductVersion from '../../model/kanel/public/ProductVersion';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { BadRequestError } from '../../utils/error/error.util';
import { isLtsVersion, isValidVersion } from '../../utils/versioning';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import { ManageProductVersionDomain } from './manage-product-version.domain';

// The GraphQL version filter only ever needs to show the most recent
// versions, so this query is capped rather than returning the whole
// (potentially large) history of a product's registered versions. Other
// consumers of ManageProductVersionDomain.loadRegisteredProductVersions
// (e.g. the public REST endpoints) still get every registered version.
const LATEST_PRODUCT_VERSIONS_LIMIT = 5;

export const ManageProductVersionApp = {
  handleNewProductVersion: async ({
    product,
    version,
  }: {
    product: PlatformIdentifier;
    version: string;
  }): Promise<void> => {
    ManifestFragmentHelper.validateProductVersion(version);
    // isLtsVersion only reads a lowercase suffix: -LTS.8 would be routed as non-LTS
    if (!isValidVersion(version)) {
      throw BadRequestError(BadRequestErrorCode.InvalidPlatformVersion, {
        detail: `Invalid version format: ${version}`,
      });
    }

    // OpenAEV is news feed only; LTS would pollute the libraries' version filter
    if (product !== PlatformIdentifier.Openaev && !isLtsVersion(version)) {
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
  },

  registerProductVersion: async ({
    product,
    version,
  }: {
    product: PlatformIdentifier;
    version: string;
  }): Promise<void> => {
    await ManageProductVersionDomain.registerProductVersion({
      product,
      version,
      version_padded:
        ManifestFragmentHelper.validateAndFormatManifestVersion(version),
    });
  },

  loadRegisteredProductVersions: async (
    product: PlatformIdentifier,
    search?: string | null
  ): Promise<ProductVersion[]> => {
    return ManageProductVersionDomain.loadRegisteredProductVersions(product, {
      search,
      limit: LATEST_PRODUCT_VERSIONS_LIMIT,
    });
  },
};
