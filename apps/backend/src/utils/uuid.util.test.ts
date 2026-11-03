import { describe, expect, it } from 'vitest';
import { isUuid } from './uuid.util';

describe('isUuid', () => {
  it.each`
    name                                    | value                                     | expected
    ${'a version 4 UUID'}                   | ${'1b4e28ba-2fa1-41d2-883f-0016d3cca427'} | ${true}
    ${'a UUID without an RFC 4122 version'} | ${'00000000-0000-0000-0000-000000000001'} | ${true}
    ${'an uppercase UUID'}                  | ${'1B4E28BA-2FA1-41D2-883F-0016D3CCA427'} | ${true}
    ${'a free text'}                        | ${'not-a-uuid'}                           | ${false}
    ${'an empty string'}                    | ${''}                                     | ${false}
  `('should return $expected when given $name', ({ value, expected }) => {
    // When
    const result = isUuid(value);

    // Then
    expect(result).toBe(expected);
  });
});
