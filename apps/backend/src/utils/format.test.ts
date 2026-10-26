import { describe, expect, it } from 'vitest';
import { formatName, toIsoDate } from './format';

describe('toIsoDate', () => {
  it.each`
    input                                 | expected
    ${'2026-09-22T12:00:00+00:00'}        | ${'2026-09-22T12:00:00.000Z'}
    ${'2026-10-22T12:07:57.335611+00:00'} | ${'2026-10-22T12:07:57.335Z'}
    ${'2026-09-22T14:00:00+02:00'}        | ${'2026-09-22T12:00:00.000Z'}
    ${'2026-09-22'}                       | ${'2026-09-22T00:00:00.000Z'}
  `('should return $expected for $input', ({ input, expected }) => {
    expect(toIsoDate(input)).toBe(expected);
  });

  it.each`
    case                 | input
    ${'an empty string'} | ${''}
    ${'not a date'}      | ${'not a date'}
    ${'a number'}        | ${1758542400000}
    ${'a Date'}          | ${new Date('2026-09-22T12:00:00.000Z')}
    ${'null'}            | ${null}
    ${'undefined'}       | ${undefined}
  `('should return null for $case', ({ input }) => {
    expect(toIsoDate(input)).toBeNull();
  });
});

describe('formatName', () => {
  it.each`
    input                   | expected
    ${'john'}               | ${'John'}
    ${'JOHN'}               | ${'John'}
    ${'jOhN'}               | ${'John'}
    ${'jean-pierre'}        | ${'Jean-Pierre'}
    ${'JEAN-PIERRE'}        | ${'Jean-Pierre'}
    ${'john doe'}           | ${'John Doe'}
    ${'JOHN DOE'}           | ${'John Doe'}
    ${'jOhN dOe'}           | ${'John Doe'}
    ${'jean-pierre dupont'} | ${'Jean-Pierre Dupont'}
    ${'a'}                  | ${'A'}
    ${'A'}                  | ${'A'}
  `('should format "$input" to "$expected"', ({ input, expected }) => {
    expect(formatName(input)).toBe(expected);
  });

  it('should return empty string for null', () => {
    expect(formatName(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatName(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(formatName('')).toBe('');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(formatName('  john  ')).toBe('John');
  });
});
