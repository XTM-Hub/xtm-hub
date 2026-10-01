import type { PlatformIdentifier } from '../../__generated__/resolvers-types';
import type ProductVersion from '../../model/kanel/public/ProductVersion';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManageProductVersionDomain } from './manage-product-version.domain';

// The GraphQL version filter only ever needs to show the most recent
// versions, so this query is capped rather than returning the whole
// (potentially large) history of a product's registered versions. Other
// consumers of ManageProductVersionDomain.loadRegisteredProductVersions
// (e.g. the public REST endpoints) still get every registered version.
const LATEST_PRODUCT_VERSIONS_LIMIT = 5;

export const ManageProductVersionApp = {
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
