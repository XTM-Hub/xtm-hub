import { describe, expect, it } from 'vitest';
import {
  PlatformContract,
  PlatformIdentifier,
} from '../../__generated__/resolvers-types';
import { RegistrationHelper } from './registration.helper';

describe('registration helper', () => {
  describe('shouldUpdateContractFromRefresh', () => {
    it.each([
      [true, PlatformContract.Ce, PlatformContract.Ee, 'licence activated'],
      [true, PlatformContract.Ee, PlatformContract.Ce, 'licence removed'],
      [false, PlatformContract.Ce, PlatformContract.Ce, 'unchanged contract'],
      [false, PlatformContract.Ee, undefined, 'platform older than the field'],
      [false, PlatformContract.Ee, null, 'explicit null'],
      [false, PlatformContract.Trial, PlatformContract.Ee, 'trial kept'],
      [
        false,
        PlatformContract.Trial,
        PlatformContract.Ce,
        'expired trial kept',
      ],
      [false, PlatformContract.Ce, PlatformContract.Trial, 'trial never set'],
    ])(
      'should return %s when the stored contract is %s and the refresh sends %s (%s)',
      (expected, storedContract, refreshedContract) => {
        // When
        const result = RegistrationHelper.shouldUpdateContractFromRefresh(
          storedContract,
          refreshedContract
        );

        // Then
        expect(result).toBe(expected);
      }
    );
  });

  describe('isTenantIdRequired', () => {
    it.each`
      identifier                    | version      | expected | description
      ${PlatformIdentifier.Opencti} | ${'6.9.0'}   | ${false} | ${'identifier never requires tenant id'}
      ${PlatformIdentifier.Openaev} | ${undefined} | ${false} | ${'missing version is treated as legacy'}
      ${PlatformIdentifier.Openaev} | ${null}      | ${false} | ${'null version is treated as legacy'}
      ${PlatformIdentifier.Openaev} | ${'2.4'}     | ${false} | ${'invalid version format does not require tenant id'}
      ${PlatformIdentifier.Openaev} | ${'2.3.9'}   | ${false} | ${'version below threshold does not require tenant id'}
      ${PlatformIdentifier.Openaev} | ${'2.4.0'}   | ${true}  | ${'version at threshold requires tenant id'}
      ${PlatformIdentifier.Openaev} | ${'2.8.12'}  | ${true}  | ${'version above threshold requires tenant id'}
    `(
      'should return $expected for $identifier at version $version ($description)',
      ({ identifier, version, expected }) => {
        const result = RegistrationHelper.isTenantIdRequired(
          identifier,
          version
        );

        expect(result).toBe(expected);
      }
    );
  });
});
