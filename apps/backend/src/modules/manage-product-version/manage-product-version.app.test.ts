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
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import { logApp } from '../../utils/app-logger.util';
import { BadRequestErrorCode } from '../../utils/error/error.code';
import { NewsFeedApp } from '../news-feed/news-feed.app';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import { ManageProductVersionApp } from './manage-product-version.app';

const OPENAEV_VERSION = '3.261104.0';
const OPENAEV_LTS_VERSION = '3.260309.0-lts.8';
const OPENCTI_VERSION = '6.4.0';
const OPENCTI_LTS_VERSION = '7.260309.0-lts.8';
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const FROZEN_NOW = new Date('2026-11-18T10:00:00.000Z').getTime();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('manageProductVersionApp', () => {
  describe('handleNewProductVersion for OpenAEV', () => {
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

    it.each([
      ['a non-LTS', OPENAEV_VERSION],
      ['an LTS', OPENAEV_LTS_VERSION],
    ])(
      'should only create the news feed item, with no manifest nor registration, when the version is %s',
      async (_description, version) => {
        // Given
        const requestManifestGenerationSpy = vi.spyOn(
          ManifestApp,
          'requestManifestGeneration'
        );
        const registerProductVersionSpy = vi.spyOn(
          ManageProductVersionApp,
          'registerProductVersion'
        );

        // When
        await ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Openaev,
          version,
        });

        // Then
        expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
        expect(registerProductVersionSpy).not.toHaveBeenCalled();
        expect(
          await TestHelper.productVersion.loadAll({
            product: PlatformIdentifier.Openaev,
          })
        ).toEqual([]);
        expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
          product: PlatformIdentifier.Openaev,
          version,
        });
      }
    );

    it('should reject an invalid version and create nothing', async () => {
      // Given
      const requestManifestGenerationSpy = vi.spyOn(
        ManifestApp,
        'requestManifestGeneration'
      );

      // When
      const call = ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Openaev,
        version: 'not-a-version',
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidPlatformVersion
      );
      expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
      expect(createGithubReleaseNewsFeedItemSpy).not.toHaveBeenCalled();
      expect(
        await TestHelper.productVersion.loadAll({
          product: PlatformIdentifier.Openaev,
        })
      ).toEqual([]);
    });
  });

  describe('handleNewProductVersion for OpenCTI', () => {
    let createGithubReleaseNewsFeedItemSpy: MockInstance<
      typeof NewsFeedApp.createGithubReleaseNewsFeedItem
    >;
    let requestManifestGenerationSpy: MockInstance<
      typeof ManifestApp.requestManifestGeneration
    >;

    // The migrations pre-register the OpenCTI 6.x and 7.x versions.
    beforeEach(async () => {
      await TestHelper.productVersion.delete({});
      createGithubReleaseNewsFeedItemSpy = vi
        .spyOn(NewsFeedApp, 'createGithubReleaseNewsFeedItem')
        .mockResolvedValue(undefined);
      requestManifestGenerationSpy = vi
        .spyOn(ManifestApp, 'requestManifestGeneration')
        .mockResolvedValue(undefined);
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await TestHelper.productVersion.delete({});
    });

    const expectNothingCreated = async () => {
      expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
      expect(createGithubReleaseNewsFeedItemSpy).not.toHaveBeenCalled();
      expect(
        await TestHelper.productVersion.loadAll({
          product: PlatformIdentifier.Opencti,
        })
      ).toEqual([]);
    };

    it('should request manifest generation and register the product version when the version is valid', async () => {
      // When
      await ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
      });

      // Then
      expect(requestManifestGenerationSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
        type: 'connector',
      });
      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
      });
      expect(rows).toHaveLength(1);
      expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
      });
    });

    it('should not register the product version when manifest generation fails', async () => {
      // Given
      requestManifestGenerationSpy.mockRejectedValue(
        new Error('manifest generation failed')
      );

      // When
      const call = ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
      });

      // Then
      await expect(call).rejects.toThrow('manifest generation failed');
      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
      });
      expect(rows).toHaveLength(0);
    });

    it('should neither request a manifest nor register the version but create the news feed item when the version is LTS', async () => {
      // When
      await ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_LTS_VERSION,
      });

      // Then
      expect(requestManifestGenerationSpy).not.toHaveBeenCalled();
      expect(
        await TestHelper.productVersion.loadAll({
          product: PlatformIdentifier.Opencti,
        })
      ).toEqual([]);
      expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_LTS_VERSION,
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
        // When
        const call = ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version,
        });

        // Then
        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidPlatformVersion
        );
        await expectNothingCreated();
      }
    );

    it('should succeed and log the error when the news feed item creation fails', async () => {
      // Given
      const newsFeedError = new Error('news feed failure');
      createGithubReleaseNewsFeedItemSpy.mockRejectedValue(newsFeedError);
      const logErrorSpy = vi.spyOn(logApp, 'error');

      // When
      await ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_LTS_VERSION,
      });

      // Then
      await vi.waitFor(() =>
        expect(logErrorSpy).toHaveBeenCalledWith(
          'Unable to create the GitHub release news feed item',
          {
            error: newsFeedError,
            product: PlatformIdentifier.Opencti,
            version: OPENCTI_LTS_VERSION,
          }
        )
      );
    });

    it.each([
      ['a non-LTS', OPENCTI_VERSION],
      ['an LTS', OPENCTI_LTS_VERSION],
    ])(
      'should forward the release date as a Date to the news feed item creation when the version is %s',
      async (_description, version) => {
        // When
        await ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version,
          releasedAt: '2026-11-18T10:00:00Z',
        });

        // Then
        expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
          product: PlatformIdentifier.Opencti,
          version,
          releasedAt: new Date('2026-11-18T10:00:00.000Z'),
        });
      }
    );

    it.each([
      [
        'without fractional seconds',
        '2026-11-18T10:00:41Z',
        '2026-11-18T10:00:41.000Z',
      ],
      [
        'with fractional seconds',
        '2026-11-18T10:00:41.123Z',
        '2026-11-18T10:00:41.123Z',
      ],
      [
        'with an offset',
        '2026-11-18T10:00:00+02:00',
        '2026-11-18T08:00:00.000Z',
      ],
      ['at the epoch', '1970-01-01T00:00:00Z', '1970-01-01T00:00:00.000Z'],
      ['on a leap day', '2024-02-29T10:00:00Z', '2024-02-29T10:00:00.000Z'],
    ])(
      'should accept a release date %s and give the matching instant',
      async (_description, releasedAt, expectedInstant) => {
        // When
        await ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_LTS_VERSION,
          releasedAt,
        });

        // Then
        expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_LTS_VERSION,
          releasedAt: new Date(expectedInstant),
        });
      }
    );

    it.each([
      ['absent', undefined],
      ['null', null],
    ])(
      'should call the news feed item creation without a date when the release date is %s',
      async (_description, releasedAt) => {
        // When
        await ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_LTS_VERSION,
          releasedAt,
        });

        // Then
        expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledTimes(1);
        expect(
          createGithubReleaseNewsFeedItemSpy.mock.calls[0]![0].releasedAt
        ).toBeUndefined();
      }
    );

    it.each([
      ['a second', 1000],
      ['exactly 5 minutes', MAX_CLOCK_SKEW_MS],
    ])(
      'should accept a release date %s ahead of the clock and forward it as given',
      async (_description, aheadMs) => {
        // Given
        vi.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW);
        const releasedAt = new Date(FROZEN_NOW + aheadMs);

        // When
        await ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_LTS_VERSION,
          releasedAt: releasedAt.toISOString(),
        });

        // Then
        expect(createGithubReleaseNewsFeedItemSpy).toHaveBeenCalledWith({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_LTS_VERSION,
          releasedAt,
        });
      }
    );

    it('should reject the release date and create nothing when it is 5 minutes and 1 ms ahead of the clock', async () => {
      // Given
      vi.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW);

      // When
      const call = ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
        releasedAt: new Date(FROZEN_NOW + MAX_CLOCK_SKEW_MS + 1).toISOString(),
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidReleaseDate
      );
      await expectNothingCreated();
    });

    it('should reject the release date and create nothing when it is a day ahead of the clock', async () => {
      // When
      const call = ManageProductVersionApp.handleNewProductVersion({
        product: PlatformIdentifier.Opencti,
        version: OPENCTI_VERSION,
        releasedAt: new Date(Date.now() + ONE_DAY_MS).toISOString(),
      });

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidReleaseDate
      );
      await expectNothingCreated();
    });

    it.each([
      ['not a date', 'not-a-date'],
      ['an empty string', ''],
      ['a date without a time zone', '2026-11-18T10:00:00'],
      ['a date without a time', '2026-11-18'],
      ['a day that does not exist in its month', '2026-02-31T10:00:00Z'],
      ['a leap day in a year that is not a leap year', '2026-02-29T10:00:00Z'],
      ['an hour of 24', '2026-11-18T24:00:00Z'],
      ['a minute of 60', '2026-11-18T10:60:00Z'],
      ['a number', 123],
      ['a boolean', true],
      ['an object', {}],
    ])(
      'should reject the release date and create nothing when it is %s',
      async (_description, releasedAt) => {
        // When
        const call = ManageProductVersionApp.handleNewProductVersion({
          product: PlatformIdentifier.Opencti,
          version: OPENCTI_VERSION,
          releasedAt,
        });

        // Then
        await expect(call).rejects.toThrow(
          BadRequestErrorCode.InvalidReleaseDate
        );
        await expectNothingCreated();
      }
    );
  });

  describe('registerProductVersion', () => {
    // The migrations pre-register the OpenCTI 6.x and 7.x versions.
    beforeEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    afterEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    it('should compute and store the padded version before inserting', async () => {
      await ManageProductVersionApp.registerProductVersion({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });

      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.version_padded).toBe(
        ManifestFragmentHelper.validateAndFormatManifestVersion('6.4.0')
      );
    });

    it('should not create a duplicate row when the same product/version is registered twice', async () => {
      await ManageProductVersionApp.registerProductVersion({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });
      await ManageProductVersionApp.registerProductVersion({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });

      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('loadRegisteredProductVersions', () => {
    // The migrations pre-register the OpenCTI 6.x and 7.x versions.
    beforeEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    afterEach(async () => {
      await TestHelper.productVersion.delete({});
    });

    it('should only return versions matching the requested product', async () => {
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

      const result =
        await ManageProductVersionApp.loadRegisteredProductVersions(
          PlatformIdentifier.Opencti
        );

      expect(result).toHaveLength(1);
      expect(result[0]!.product).toBe(PlatformIdentifier.Opencti);
    });

    it('should only return versions matching the search term', async () => {
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

      const result =
        await ManageProductVersionApp.loadRegisteredProductVersions(
          PlatformIdentifier.Opencti,
          '7.0'
        );

      expect(result.map((row) => row.version)).toEqual(['7.0.0']);
    });

    it('should cap the results to the 5 most recent versions when more than 5 are registered', async () => {
      for (const version of [
        '6.1.0',
        '6.2.0',
        '6.3.0',
        '6.4.0',
        '6.5.0',
        '6.6.0',
      ]) {
        await TestHelper.productVersion.create({
          product: PlatformIdentifier.Opencti,
          version,
          version_padded:
            ManifestFragmentHelper.validateAndFormatManifestVersion(version),
        });
      }

      const result =
        await ManageProductVersionApp.loadRegisteredProductVersions(
          PlatformIdentifier.Opencti
        );

      expect(result.map((row) => row.version)).toEqual([
        '6.6.0',
        '6.5.0',
        '6.4.0',
        '6.3.0',
        '6.2.0',
      ]);
    });
  });
});
