import { describe, expect, it } from 'vitest';
import { TEST_SYSTEM_TOKEN } from '../../tests/tests.const';
import { isValidSystemToken } from './system-token';

describe('isValidSystemToken', () => {
  it.each([
    { label: 'the configured token', token: TEST_SYSTEM_TOKEN, expected: true },
    { label: 'another token', token: 'invalid-token', expected: false },
    {
      label: 'the configured token with a suffix',
      token: `${TEST_SYSTEM_TOKEN}X`,
      expected: false,
    },
    { label: 'an empty token', token: '', expected: false },
    { label: 'no token', token: null, expected: false },
  ])('should answer $expected when given $label', ({ token, expected }) => {
    // Given the token

    // When
    const isValid = isValidSystemToken(token);

    // Then
    expect(isValid).toBe(expected);
  });
});
