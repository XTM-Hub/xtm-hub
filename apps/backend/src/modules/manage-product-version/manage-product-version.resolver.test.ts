import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import { ManifestFragmentHelper } from '../shareable-resource/manifest-fragment/manifest-fragment.helper';
import { ManifestApp } from '../shareable-resource/manifest/manifest.app';
import resolvers from './manage-product-version.resolver';

describe('manageProductVersionResolver', () => {
  describe('mutation.newProductVersion', () => {
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
        { product: PlatformIdentifier.Opencti, version: '6.4.0' },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(requestManifestGenerationSpy).toHaveBeenCalledWith({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
        type: 'connector',
      });
      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
        version: '6.4.0',
      });
      expect(rows).toHaveLength(1);
      expect(result).toEqual({ success: true });
    });

    it('should not register the product version when manifest generation fails', async () => {
      vi.spyOn(ManifestApp, 'requestManifestGeneration').mockRejectedValue(
        new Error('invalid version')
      );

      await expect(
        resolvers.Mutation!.newProductVersion!(
          {},
          { product: PlatformIdentifier.Opencti, version: 'not-a-version' },
          contextSimpleUserFiligran2,
          GRAPHQL_RESOLVE_INFO
        )
      ).rejects.toThrow('invalid version');

      const rows = await TestHelper.productVersion.loadAll({
        product: PlatformIdentifier.Opencti,
      });
      expect(rows).toHaveLength(0);
    });
  });

  describe('query.registeredProductVersions', () => {
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
