import { describe, expect, it } from 'vitest';
import {
  compareVersions,
  doesVersionSatisfy,
  isCalendarVersion,
  isLtsVersion,
  isValidVersion,
  toCalendarVersion,
} from './versioning';

describe('versioning', () => {
  describe('isCalendarVersion', () => {
    it.each`
      version               | expected
      ${'6.8.4'}            | ${false}
      ${'6.9.29'}           | ${false}
      ${'6.250101.0'}       | ${true}
      ${'7.260928.0'}       | ${true}
      ${'7.260309.0-lts.7'} | ${true}
    `('should return $expected for $version', ({ version, expected }) => {
      expect(isCalendarVersion(version)).toBe(expected);
    });
  });

  describe('isCalendarVersion on the real OpenCTI tags', () => {
    it.each([
      '2.0.0',
      '3.3.2',
      '4.5.5',
      '5.12.33',
      '6.0.0',
      '6.8.4',
      '6.9.0',
      '6.9.29',
    ])('should treat %s as a semantic version', (tag) => {
      expect(isCalendarVersion(tag)).toBe(false);
    });

    it.each([
      '7.260224.0',
      '7.260306.1',
      '7.260309.0-lts.7',
      '7.260309.0-lts1',
      '7.260811.0-lts.1',
      '7.261002.0',
    ])('should treat %s as a calendar version', (tag) => {
      expect(isCalendarVersion(tag)).toBe(true);
    });

    it('should order the last semantic tag before the first calendar tag', () => {
      expect(compareVersions('6.9.29', '7.260224.0')).toBeLessThan(0);
    });
  });

  describe('toCalendarVersion', () => {
    it.each`
      version               | expected        | description
      ${'6.8.4'}            | ${'6.251010.0'} | ${'semantic 6.x mapped to its release date'}
      ${'6.8.0'}            | ${'6.250925.0'} | ${'semantic minor release'}
      ${'6.8.99'}           | ${'6.251210.0'} | ${'unknown patch falls back to the latest known patch of the minor'}
      ${'7.260928.0'}       | ${'7.260928.0'} | ${'calendar version unchanged'}
      ${'7.260309.0-lts.7'} | ${'7.260309.0'} | ${'calendar version without LTS suffix'}
      ${'6.99.0'}           | ${null}         | ${'unknown minor'}
      ${'notaversion'}      | ${null}         | ${'invalid version'}
    `(
      'should return $expected for "$version" ($description)',
      ({ version, expected }: { version: string; expected: string | null }) => {
        expect(toCalendarVersion(version)).toBe(expected);
      }
    );

    it('orders the semantic releases and the calendar requirements consistently', () => {
      const calendar = toCalendarVersion('6.8.4')!;

      expect(compareVersions('6.250101.0', calendar)).toBeLessThan(0);
      expect(compareVersions('6.251101.0', calendar)).toBeGreaterThan(0);
      expect(compareVersions('7.260101.0', calendar)).toBeGreaterThan(0);
    });
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
