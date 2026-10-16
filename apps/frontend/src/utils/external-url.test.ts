import { describe, expect, it } from 'vitest';
import { toExternalHref, toUrlOrigin } from './external-url';

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

describe('toUrlOrigin', () => {
  it.each`
    input                                   | expected
    ${'https://opencti.example.com'}        | ${'https://opencti.example.com'}
    ${'https://openaev.example.com/tenant'} | ${'https://openaev.example.com'}
    ${'http://localhost:3000/dashboard'}    | ${'http://localhost:3000'}
  `('returns the origin of "$input"', ({ input, expected }) => {
    expect(toUrlOrigin(input)).toBe(expected);
  });

  it.each`
    input                    | reason
    ${null}                  | ${'null'}
    ${undefined}             | ${'undefined'}
    ${'not a url'}           | ${'invalid url'}
    ${'javascript:alert(1)'} | ${'javascript scheme'}
    ${'file:///etc/passwd'}  | ${'file scheme'}
  `('returns null for $reason', ({ input }) => {
    expect(toUrlOrigin(input)).toBeNull();
  });
});
