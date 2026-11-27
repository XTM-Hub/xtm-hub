import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  contextSystemToken,
  GRAPHQL_RESOLVE_INFO,
} from '../../../tests/tests.const';
import { PlatformIdentifier } from '../../__generated__/resolvers-types';
import type ProductVersion from '../../model/kanel/public/ProductVersion';
import type { ProductVersionId } from '../../model/kanel/public/ProductVersion';
import {
  BadRequestErrorCode,
  UnknownErrorCode,
} from '../../utils/error/error.code';
import { BadRequestError } from '../../utils/error/error.util';
import { ManageProductVersionApp } from './manage-product-version.app';
import resolvers from './manage-product-version.resolver';

const OPENCTI_LTS_VERSION = '7.260309.0-lts.8';
const SEARCH_TERM = '7.0';
const REGISTERED_VERSIONS: ProductVersion[] = [
  {
    id: 'a1b2c3d4-0000-4000-8000-000000000001' as ProductVersionId,
    product: PlatformIdentifier.Opencti,
    version: '7.0.0',
    version_padded: '000007.000000.000000',
    created_at: new Date('2026-11-18T10:00:00.000Z'),
  },
];

describe('manageProductVersionResolver', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('mutation.newProductVersion', () => {
    it('should reject with the error code of the app when the app throws a bad request error', async () => {
      // Given
      vi.spyOn(
        ManageProductVersionApp,
        'handleNewProductVersion'
      ).mockRejectedValue(
        BadRequestError(BadRequestErrorCode.InvalidPlatformVersion, {
          detail: 'Invalid version format',
        })
      );

      // When
      const call = resolvers.Mutation!.newProductVersion!(
        {},
        { product: PlatformIdentifier.Opencti, version: 'not-a-version' },
        contextSystemToken,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      await expect(call).rejects.toThrow(
        BadRequestErrorCode.InvalidPlatformVersion
      );
    });

    it('should reject with the unknown error code when the app throws an unexpected error', async () => {
      // Given
      vi.spyOn(
        ManageProductVersionApp,
        'handleNewProductVersion'
      ).mockRejectedValue(new Error('boom'));

      // When
      const call = resolvers.Mutation!.newProductVersion!(
        {},
        { product: PlatformIdentifier.Opencti, version: OPENCTI_LTS_VERSION },
        contextSystemToken,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      await expect(call).rejects.toThrow(UnknownErrorCode.UnknownError);
    });
  });

  describe('query.registeredProductVersions', () => {
    it('should forward the product and the search term to the app and return its result', async () => {
      // Given
      const loadRegisteredProductVersionsSpy = vi
        .spyOn(ManageProductVersionApp, 'loadRegisteredProductVersions')
        .mockResolvedValue(REGISTERED_VERSIONS);

      // When
      const result = await resolvers.Query!.registeredProductVersions!(
        {},
        { product: PlatformIdentifier.Opencti, search: SEARCH_TERM },
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      // Then
      expect(loadRegisteredProductVersionsSpy).toHaveBeenCalledWith(
        PlatformIdentifier.Opencti,
        SEARCH_TERM
      );
      expect(result).toEqual(REGISTERED_VERSIONS);
    });
  });
});
