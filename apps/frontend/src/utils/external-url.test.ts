import { describe, expect, it } from 'vitest';
import { toExternalHref } from './external-url';

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
    ${'localhost:3000'}          | ${'ambiguous single-label host:port'}
  `('returns null for $reason', ({ input }) => {
    expect(toExternalHref(input)).toBeNull();
  });
});
