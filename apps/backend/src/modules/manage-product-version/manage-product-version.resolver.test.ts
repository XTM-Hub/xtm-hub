import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextSimpleUserFiligran2,
  contextSystemToken,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import resolvers from './manage-product-version.resolver';

const NON_LTS_VERSION = '6.4.0';
const LTS_VERSION = '7.260309.0-lts.8';

describe('manageProductVersionResolver', () => {
  describe('mutation.newProductVersion', () => {
    // Mocked in every test: it is not awaited by the mutation, its behaviour is tested in news-feed.app.test.ts
    let createGithubReleaseNewsFeedItemSpy: MockInstance<
      typeof NewsFeedApp.createGithubReleaseNewsFeedItem
    >;

    // The migrations pre-register the OpenCTI 6.x and 7.x versions.
    beforeEach(async () => {
      await TestHelper.productVersion.delete({});
      createGithubReleaseNewsFeedItemSpy = vi
        .spyOn(NewsFeedApp, 'createGithubReleaseNewsFeedItem')
        .mockResolvedValue(undefined);
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await TestHelper.productVersion.delete({});
    });

    it('should request manifest generation and register the product version when the version is valid', async () => {
      const requestManifestGenerationSpy = vi
        .spyOn(ManifestApp, 'requestManifestGeneration')
        .mockResolvedValue(undefined);

      const result = await resolvers.Mutation!.newProductVersion!(
        {},
        { product: PlatformIdentifier.Opencti, version: NON_LTS_VERSION },
        contextSystemToken,
        GRAPHQL_RESOLVE_INFO
      );

      expect(requestManifestGenerationSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: NON_LTS_VERSION,
        type: 'connector',
      });
      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
        version: NON_LTS_VERSION,
      });
      expect(rows).toHaveLength(1);
      expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: NON_LTS_VERSION,
      });
      expect(result).toEqual({ success: true });
    });

    it('should not register the product version when manifest generation fails', async () => {
      vi.spyOn(ManifestApp, 'requestManifestGeneration').mockRejectedValue(
        new Error('manifest generation failed')
      );

      await expect(
        resolvers.Mutation!.newProductVersion!(
          {},
          { product: PlatformIdentifier.Opencti, version: NON_LTS_VERSION },
          contextSystemToken,
          GRAPHQL_RESOLVE_INFO
        )
      ).rejects.toThrow('manifest generation failed');

      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
      });
      expect(rows).toHaveLength(0);
    });

    it('should neither request a manifest nor register the version but create the news feed item when the version is LTS', async () => {
      // Given
      const requestManifestGenerationSpy = vi.spyOn(
        ManifestApp,
        'requestManifestGeneration'
      );

      // When
      const result = await resolvers.Mutation!.newProductVersion!(
        {},
        { product: PlatformIdentifier.Opencti, version: LTS_VERSION },
        contextSystemToken,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toEqual({ success: true });
      expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
      expect(
        await TestHelper.productVersion.loadAll({
          product: PlatformIdentifier.Opencti,
        })
      ).toEqual([]);
      expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: LTS_VERSION,
      });
    });

    it.each([
      ['not a version', 'not-a-version'],
      ['an LTS suffix without patch', '7.260309.0-lts'],
      ['an LTS suffix without dot', '7.260309.0-lts8'],
      ['a date part longer than 6 digits', '7.2603091.0'],
      ['an uppercase LTS suffix', '7.260309.0-LTS.8'],
    ])(
      'should reject the version and create nothing when it is %s',
      async (_description, version) => {
        // Given
        const requestManifestGenerationSpy = vi.spyOn(
          ManifestApp,
          'requestManifestGeneration'
        );

        // When
        const call = resolvers.Mutation!.newProductVersion!(
          {},
          { product: PlatformIdentifier.Opencti, version },
          contextSystemToken,
          GRAPHQL_RESOLVE_INFO
        );

        // Then
        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidPlatformVersion
        );
        expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
        expect(createGithubReleaseNewsFeedItemSpy).not.toHaveBeenCalled();
        expect(
          await TestHelper.productVersion.loadAll({
            product: PlatformIdentifier.Opencti,
          })
        ).toEqual([]);
      }
    );

    it('should succeed and log the error when the news feed item creation fails', async () => {
      // Given
      const newsFeedError = new Error('news feed failure');
      createGithubReleaseNewsFeedItemSpy.mockRejectedValue(newsFeedError);
      const logErrorSpy = vi.spyOn(logApp, 'error');

      // When
      const result = await resolvers.Mutation!.newProductVersion!(
        {},
        { product: PlatformIdentifier.Opencti, version: LTS_VERSION },
        contextSystemToken,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(result).toEqual({ success: true });
      await vi.waitFor(() =>
        expect(logErrorSpy).toHaveBeenCalledWith(
          'Unable to create the GitHub release news feed item',
          {
            error: newsFeedError,
            product: PlatformIdentifier.Opencti,
            version: LTS_VERSION,
          }
        )
      );
    });
  });

  describe('query.registeredProductVersions', () => {
    // The migrations pre-register the OpenCTI 6.x and 7.x versions.
    beforeEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    afterEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    it('should return the registered versions for the requested product', async () => {
      await TestHelper.productVersion.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        version_padded:
          ManifestFragmentHelper.validateAndFormatManifestVersion('6.4.0'),
      });
      await TestHelper.productVersion.create({
        product: PlatformIdentifier.Openaev,
        version: '1.0.0',
        version_padded:
          ManifestFragmentHelper.validateAndFormatManifestVersion('1.0.0'),
      });

      const result = await resolvers.Query!.registeredProductVersions!(
        {},
        { product: PlatformIdentifier.Opencti },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(result).toHaveLength(1);
      expect((result as { version: string }[])[0]!.version).toBe('6.4.0');
    });

    it('should forward the search term to only return matching versions', async () => {
      await TestHelper.productVersion.create({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        version_padded:
          ManifestFragmentHelper.validateAndFormatManifestVersion('6.4.0'),
      });
      await TestHelper.productVersion.create({
        product: PlatformIdentifier.Opencti,
        version: '7.0.0',
        version_padded:
          ManifestFragmentHelper.validateAndFormatManifestVersion('7.0.0'),
      });

      const result = await resolvers.Query!.registeredProductVersions!(
        {},
        { product: PlatformIdentifier.Opencti, search: '7.0' },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(
        (result as { version: string }[]).map((row) => row.version)
      ).toEqual(['7.0.0']);
    });
  });
});
