import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManageProductVersionApp } from './manage-product-version.app';

describe('manageProductVersionApp', () => {
  describe('registerProductVersion', () => {
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
