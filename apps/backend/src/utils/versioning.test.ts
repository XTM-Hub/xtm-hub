import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  doesVersionSatisfy,
  isLtsVersion,
  isValidVersion,
} from './versioning';

describe('versioning', () => {
  describe('compareVersions on the OpenCTI tags', () => {
    it.each`
      lower           | higher
      ${'6.8.4'}      | ${'6.9.0'}
      ${'6.9.29'}     | ${'7.260224.0'}
      ${'6.8.4'}      | ${'7.260224.0'}
      ${'7.260224.0'} | ${'7.261002.0'}
    `(
      'should order $lower (semver 6.x) before $higher',
      ({ lower, higher }: { lower: string; higher: string }) => {
        expect(compareVersions(lower, higher)).toBeLessThan(0);
        expect(compareVersions(higher, lower)).toBeGreaterThan(0);
      }
    );
  });

  describe('isLtsVersion', () => {
    it.each`
      version               | expected | description
      ${'6.4.0'}            | ${false} | ${'plain semantic version'}
      ${'6.4.0-lts'}        | ${true}  | ${'lts without patch'}
      ${'7.260801.0-lts'}   | ${true}  | ${'lts with date-based minor'}
      ${'7.260801.0-lts.1'} | ${true}  | ${'lts with dot patch'}
      ${'7.260309.0-lts1'}  | ${true}  | ${'lts with inline patch'}
      ${'notaversion'}      | ${false} | ${'invalid string'}
      ${'7.260201-lts'}     | ${false} | ${'invalid lts — missing patch segment'}
    `(
      'should return $expected for "$version" ($description)',
      ({ version, expected }: { version: string; expected: boolean }) => {
        expect(isLtsVersion(version)).toBe(expected);
      }
    );
  });

  describe('isValidVersion', () => {
    it.each`
      version               | expected
      ${'1.0.0'}            | ${true}
      ${'7.260801.0-lts'}   | ${true}
      ${'7.260801.0-lts.1'} | ${true}
      ${'1.0.X'}            | ${false}
      ${'7.260201-lts'}     | ${false}
      ${'7.260309.0-lts1'}  | ${true}
    `('should return $expected for $version', ({ version, expected }) => {
      expect(isValidVersion(version)).toBe(expected);
    });
  });

  describe('doesVersionSatisfy', () => {
    it.each`
      given                 | required              | expected
      ${'1.0.0'}            | ${'1.0.0'}            | ${true}
      ${'7.260801.0-lts'}   | ${'7.260801.0-lts'}   | ${true}
      ${'7.260801.0-lts.1'} | ${'7.260801.0-lts.1'} | ${true}
      ${'1.0.0'}            | ${'0.9.9'}            | ${true}
      ${'7.260801.0-lts'}   | ${'6.8.3'}            | ${true}
      ${'7.260801.0-lts.1'} | ${'7.260801.0-lts'}   | ${true}
      ${'7.260801.0-lts.2'} | ${'7.260801.0-lts.1'} | ${true}
      ${'0.9.9'}            | ${'1.0.0'}            | ${false}
      ${'6.8.3'}            | ${'7.260801.0-lts'}   | ${false}
      ${'7.260801.0-lts'}   | ${'7.260802.0-lts'}   | ${false}
      ${'7.260801.0-lts'}   | ${'7.260801.0-lts.1'} | ${false}
      ${'7.260801.0-lts.1'} | ${'7.260801.0-lts.2'} | ${false}
    `(
      '$given satisfies $required = $expected',
      ({ given, required, expected }) => {
        expect(
          doesVersionSatisfy({ givenVersion: given, requiredVersion: required })
        ).toBe(expected);
      }
    );
  });

  describe('compareVersions', () => {
    it.each`
      a                      | b                      | expected
      ${'1.2.3'}             | ${'1.2.3'}             | ${0}
      ${'0.0.0'}             | ${'0.0.0'}             | ${0}
      ${'7.260801.0-lts'}    | ${'7.260801.0-lts'}    | ${0}
      ${'7.260801.0-lts.1'}  | ${'7.260801.0-lts.1'}  | ${0}
      ${'1.2.4'}             | ${'1.2.3'}             | ${1}
      ${'2.0.0'}             | ${'1.9.9'}             | ${1}
      ${'1.10.0'}            | ${'1.2.9'}             | ${1}
      ${'8.260801.0-lts'}    | ${'7.260801.0-lts'}    | ${1}
      ${'7.260803.0-lts'}    | ${'7.260801.0-lts'}    | ${1}
      ${'7.260901.0-lts'}    | ${'7.260801.0-lts'}    | ${1}
      ${'7.270801.0-lts'}    | ${'7.260801.0-lts'}    | ${1}
      ${'7.260801.1-lts'}    | ${'7.260801.0-lts'}    | ${1}
      ${'7.260801.0-lts.1'}  | ${'7.260801.0-lts'}    | ${1}
      ${'7.260801.0-lts.12'} | ${'7.260801.0-lts.2'}  | ${1}
      ${'7.260801.0-lts'}    | ${'6.8.3'}             | ${1}
      ${'7.260801.0-lts.1'}  | ${'6.8.3'}             | ${1}
      ${'1.2.3'}             | ${'1.2.4'}             | ${-1}
      ${'1.9.9'}             | ${'2.0.0'}             | ${-1}
      ${'1.2.9'}             | ${'1.10.0'}            | ${-1}
      ${'7.260801.0-lts'}    | ${'8.260801.0-lts'}    | ${-1}
      ${'7.260801.0-lts'}    | ${'7.260803.0-lts'}    | ${-1}
      ${'7.260801.0-lts'}    | ${'7.260901.0-lts'}    | ${-1}
      ${'7.260801.0-lts'}    | ${'7.270801.0-lts'}    | ${-1}
      ${'7.260801.0-lts'}    | ${'7.260801.1-lts'}    | ${-1}
      ${'7.260801.0-lts'}    | ${'7.260801.0-lts.1'}  | ${-1}
      ${'7.260801.0-lts.2'}  | ${'7.260801.0-lts.12'} | ${-1}
      ${'6.8.3'}             | ${'7.260801.0-lts'}    | ${-1}
      ${'6.8.3'}             | ${'7.260801.0-lts.1'}  | ${-1}
    `('compareVersions($a, $b) === $expected', ({ a, b, expected }) => {
      expect(compareVersions(a, b)).toBe(expected);
    });
  });
});
