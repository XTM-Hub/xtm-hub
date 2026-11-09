import { describe, expect, it } from 'vitest';
import { hashPassword } from '../../utils/hash-password.util';
import { validatePassword } from './user';

describe('validatePassword', () => {
  const { salt, hash } = hashPassword('the-right-password');

  it.each`
    description                        | tentativePassword       | storedHash                 | expected
    ${'the right password'}            | ${'the-right-password'} | ${hash}                    | ${true}
    ${'a wrong password'}              | ${'a-wrong-password'}   | ${hash}                    | ${false}
    ${'a stored hash of another size'} | ${'the-right-password'} | ${hash.slice(0, 10)}       | ${false}
    ${'an empty stored hash'}          | ${'the-right-password'} | ${''}                      | ${false}
    ${'a stored hash that is not hex'} | ${'the-right-password'} | ${'z'.repeat(hash.length)} | ${false}
  `(
    'should return $expected for $description',
    ({
      tentativePassword,
      storedHash,
      expected,
    }: {
      tentativePassword: string;
      storedHash: string;
      expected: boolean;
    }) => {
      // When
      const result = validatePassword(salt, tentativePassword, storedHash);

      // Then
      expect(result).toBe(expected);
    }
  );
});
