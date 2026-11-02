import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import {
  LicenseType,
  PlatformContract,
  PlatformIdentifier,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import {
  getPlatformIdentifier,
  isBundleProduct,
  isEeCapableContract,
  requiresEnterpriseEdition,
} from './platform';

describe('isEeCapableContract', () => {
  it.each([
    [PlatformContract.Ee, true],
    [PlatformContract.Trial, true],
    [PlatformContract.Ce, false],
    [null, false],
    [undefined, false],
  ])('returns %s => %s', (contract, expected) => {
    expect(isEeCapableContract(contract)).toBe(expected);
  });
});

describe('requiresEnterpriseEdition', () => {
  it.each([
    [LicenseType.Commercial, true],
    [LicenseType.Free, false],
    [null, false],
    [undefined, false],
  ])('returns %s for license type %s', (licenseType, expected) => {
    expect(requiresEnterpriseEdition(licenseType)).toBe(expected);
  });
});

describe('getPlatformIdentifier', () => {
  it.each([
    [ShareableResourceType.OPENAEV_SCENARIO, PlatformIdentifier.Openaev],
    [ShareableResourceType.OPENCTI_INTEGRATION, PlatformIdentifier.Opencti],
    [
      ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      PlatformIdentifier.Opencti,
    ],
    [ShareableResourceType.OPENCTI_CUSTOM_VIEW, PlatformIdentifier.Opencti],
    [ShareableResourceType.OPENCTI_PLAYBOOK, PlatformIdentifier.Opencti],
    ['unknown-type', PlatformIdentifier.Opencti],
  ])('should target the %s resource at the %s platform', (type, expected) => {
    // Given / When
    const platform = getPlatformIdentifier(type);

    // Then
    expect(platform).toBe(expected);
  });
});

describe('isBundleProduct', () => {
  it('should flag a bundle product when the deployment request has a parent', () => {
    // Given
    const deploymentRequest = { parent_id: 'parent-id' };

    // When
    const result = isBundleProduct(deploymentRequest);

    // Then
    expect(result).toBe(true);
  });

  it.each([
    ['the deployment request has no parent', { parent_id: null }],
    ['there is no deployment request', null],
    ['the deployment request is undefined', undefined],
  ])(
    'should not flag a bundle product when %s',
    (_context, deploymentRequest) => {
      // Given / When
      const result = isBundleProduct(deploymentRequest);

      // Then
      expect(result).toBe(false);
    }
  );
});
