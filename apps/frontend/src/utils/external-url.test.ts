import { describe, expect, it } from 'vitest';
import { getUrlOrigin, toExternalHref } from './external-url';

describe('toExternalHref', () => {
  it.each`
    input                         | expected
    ${'opencti.example.com'}      | ${'https://opencti.example.com/'}
    ${'opencti.example.com/path'} | ${'https://opencti.example.com/path'}
    ${'opencti.example.com:8443'} | ${'https://opencti.example.com:8443/'}
    ${'//opencti.example.com'}    | ${'https://opencti.example.com/'}
    ${'https://opencti.io'}       | ${'https://opencti.io/'}
    ${'http://opencti.io'}        | ${'http://opencti.io/'}
    ${'  opencti.example.com  '}  | ${'https://opencti.example.com/'}
    ${'HTTPS://OpenCTI.io'}       | ${'https://opencti.io/'}
    ${'localhost:3000'}           | ${'https://localhost:3000/'}
  `('normalises "$input" to "$expected"', ({ input, expected }) => {
    expect(toExternalHref(input)).toBe(expected);
  });

  it.each`
    input                        | reason
    ${null}                      | ${'null'}
    ${undefined}                 | ${'undefined'}
    ${''}                        | ${'empty string'}
    ${'   '}                     | ${'blank string'}
    ${'javascript:alert(1)'}     | ${'javascript scheme'}
    ${'java\nscript:alert(1)'}   | ${'newline-injected scheme'}
    ${'data:text/html,<script>'} | ${'data scheme'}
    ${'file:///etc/passwd'}      | ${'file scheme'}
    ${'vbscript:msgbox(1)'}      | ${'vbscript scheme'}
    ${'ftp://example.com'}       | ${'ftp scheme'}
  `('returns null for $reason', ({ input }) => {
    expect(toExternalHref(input)).toBeNull();
  });
});

describe('getUrlOrigin', () => {
  it.each`
    input                                          | expected
    ${'https://opencti.example.com'}               | ${'https://opencti.example.com'}
    ${'https://opencti.example.com/'}              | ${'https://opencti.example.com'}
    ${'https://opencti.example.com/dashboard?a=1'} | ${'https://opencti.example.com'}
    ${'https://opencti.example.com:8443/path#x'}   | ${'https://opencti.example.com:8443'}
    ${'http://localhost:4000/admin'}               | ${'http://localhost:4000'}
    ${'HTTPS://OpenCTI.example.com/Path'}          | ${'https://opencti.example.com'}
  `(
    'should return "$expected" when the URL is "$input"',
    ({ input, expected }) => {
      // Given / When
      const origin = getUrlOrigin(input);

      // Then
      expect(origin).toBe(expected);
    }
  );

  it.each([
    [null, 'null'],
    [undefined, 'undefined'],
    ['', 'empty string'],
    ['   ', 'blank string'],
    ['not a url', 'unparsable string'],
    ['opencti.example.com', 'URL without scheme'],
    ['/dashboard', 'relative path'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['data:text/html,<script>', 'data scheme'],
    ['file:///etc/passwd', 'file scheme'],
    ['ftp://example.com', 'ftp scheme'],
  ])('should return null when the URL is %s (%s)', (input) => {
    // Given / When
    const origin = getUrlOrigin(input);

    // Then
    expect(origin).toBeNull();
  });
});
