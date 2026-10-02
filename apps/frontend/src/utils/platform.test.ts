import { LicenseType, PlatformContract } from '@graphql/generated';
import { describe, expect, it } from 'vitest';
import { isEeCapableContract, requiresEnterpriseEdition } from './platform';

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
