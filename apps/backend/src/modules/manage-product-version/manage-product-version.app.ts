import { z } from 'zod';
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

// How far ahead of the Hub's clock a release date may be: the n8n caller and the Hub do not share a clock.
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const parseReleasedAt = (releasedAt: unknown): Date | undefined => {
  if (releasedAt === undefined || releasedAt === null) {
    return undefined;
  }

  // The Date scalar has no serializer: it lets any JSON value through, so the value is checked here. The offset is
  // required, a zone-less string would be read in the server's time zone.
  const parsed = z.iso.datetime({ offset: true }).safeParse(releasedAt);
  if (!parsed.success) {
    throw BadRequestError(BadRequestErrorCode.InvalidReleaseDate, {
      detail: 'releasedAt must be an ISO 8601 date-time with a time zone',
    });
  }

  const date = new Date(parsed.data);
  if (date.getTime() > Date.now() + MAX_CLOCK_SKEW_MS) {
    throw BadRequestError(BadRequestErrorCode.InvalidReleaseDate, {
      detail: "releasedAt is more than 5 minutes ahead of the Hub's clock",
    });
  }
  return date;
};

export const ManageProductVersionApp = {
  handleNewProductVersion: async ({
    product,
    version,
    releasedAt,
  }: {
    product: PlatformIdentifier;
    version: string;
    releasedAt?: unknown;
  }): Promise<void> => {
    const releaseDate = parseReleasedAt(releasedAt);
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
      releasedAt: releaseDate,
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
