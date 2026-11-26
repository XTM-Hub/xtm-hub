import { describe, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import {
  ForbiddenErrorCode,
  UnauthenticatedErrorCode,
} from '../../utils/error/error.code';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import { ManageProductVersionApp } from './manage-product-version.app';

// No migration seeds this product and version
const PRODUCT = PlatformIdentifier.Openaev;
const VERSION = '9.9.9';
const deleteTestVersion = () =>
  TestHelper.productVersion.delete({ product: PRODUCT, version: VERSION });

describe('newProductVersion mutation', () => {
  TestHelper.expectAccessMatrix({
    operation: `mutation ($product: PlatformIdentifier!, $version: String!) {
      newProductVersion(product: $product, version: $version) { success }
    }`,
    // Mocked: it would create a news feed item, and it is the one step every product goes through
    guarded: () =>
      vi
        .spyOn(NewsFeedApp, 'createGithubReleaseNewsFeedItem')
        .mockResolvedValue(undefined),
    expected: {
      anonymous: UnauthenticatedErrorCode.Unauthenticated,
      user: UnauthenticatedErrorCode.Unauthenticated,
      admin: UnauthenticatedErrorCode.Unauthenticated,
      system: 'allowed',
      invalidSystemToken: UnauthenticatedErrorCode.Unauthenticated,
      // A Bearer token is not the system token: the caller is anonymous, a read token is refused first
      tokenRead: ForbiddenErrorCode.ReadOnlyApiToken,
      tokenReadWrite: UnauthenticatedErrorCode.Unauthenticated,
      tokenAdmin: UnauthenticatedErrorCode.Unauthenticated,
    },
    prepare: async () => {
      // Mocked: it queues a manifest build
      const requestManifestGeneration = vi
        .spyOn(ManifestApp, 'requestManifestGeneration')
        .mockResolvedValue(undefined);
      return {
        variables: { product: PRODUCT, version: VERSION },
        expectedData: { newProductVersion: { success: true } },
        cleanup: async () => {
          requestManifestGeneration.mockRestore();
          await deleteTestVersion();
        },
      };
    },
  });
});

describe('registeredProductVersions query', () => {
  TestHelper.expectAccessMatrix({
    operation: `query ($product: PlatformIdentifier!, $search: String) {
      registeredProductVersions(product: $product, search: $search) { version }
    }`,
    guarded: () =>
      vi.spyOn(ManageProductVersionApp, 'loadRegisteredProductVersions'),
    expected: { anonymous: 'allowed', user: 'allowed', admin: 'allowed' },
    prepare: async () => {
      await TestHelper.productVersion.create({
        product: PRODUCT,
        version: VERSION,
      });
      return {
        variables: { product: PRODUCT, search: VERSION },
        expectedData: { registeredProductVersions: [{ version: VERSION }] },
        cleanup: deleteTestVersion,
      };
    },
  });
});
