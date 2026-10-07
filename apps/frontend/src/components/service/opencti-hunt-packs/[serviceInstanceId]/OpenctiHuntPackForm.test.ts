import { describe, expect, it } from 'vitest';
import { openCTIHuntPackFormSchema } from './OpenctiHuntPackForm';

describe('openCTIHuntPackFormSchema', () => {
  describe('product_version', () => {
    it.each`
      version               | expected
      ${'7.261003.0'}       | ${true}
      ${'7.261010.0-lts'}   | ${true}
      ${'7.261010.0-lts2'}  | ${true}
      ${'7.261010.0-lts.2'} | ${true}
      ${'7.261010.0-LTS.2'} | ${true}
      ${'7.261010'}         | ${false}
      ${'7.261010.0-lts.'}  | ${false}
      ${'not-a-version'}    | ${false}
    `(
      'should accept "$version": $expected',
      ({ version, expected }: { version: string; expected: boolean }) => {
        expect(
          openCTIHuntPackFormSchema.shape.product_version.safeParse(version)
            .success
        ).toBe(expected);
      }
    );
  });
});
