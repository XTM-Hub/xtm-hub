import { describe, expect, it } from 'vitest';
import {
  formatName,
  percentToRatio,
  toFiniteNumber,
  toIsoDate,
  toUtcDayStart,
  toUtcMonthStart,
} from './format';

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

describe('toUtcMonthStart', () => {
  it.each`
    date                          | expected
    ${'2026-10-01T00:00:00.000Z'} | ${'2026-10-01T00:00:00.000Z'}
    ${'2026-10-27T09:30:00.000Z'} | ${'2026-10-01T00:00:00.000Z'}
    ${'2026-12-31T23:59:59.999Z'} | ${'2026-12-01T00:00:00.000Z'}
  `('should return $expected for $date', ({ date, expected }) => {
    expect(new Date(toUtcMonthStart(new Date(date))).toISOString()).toBe(
      expected
    );
  });

  it.each`
    date                          | monthOffset | expected
    ${'2026-10-27T09:30:00.000Z'} | ${-2}       | ${'2026-08-01T00:00:00.000Z'}
    ${'2026-02-15T12:00:00.000Z'} | ${-5}       | ${'2025-09-01T00:00:00.000Z'}
    ${'2026-01-31T12:00:00.000Z'} | ${1}        | ${'2026-02-01T00:00:00.000Z'}
    ${'2026-12-15T00:00:00.000Z'} | ${1}        | ${'2027-01-01T00:00:00.000Z'}
    ${'2026-11-30T23:59:59.999Z'} | ${14}       | ${'2028-01-01T00:00:00.000Z'}
  `(
    'should return $expected for $date shifted by $monthOffset months',
    ({ date, monthOffset, expected }) => {
      expect(
        new Date(toUtcMonthStart(new Date(date), monthOffset)).toISOString()
      ).toBe(expected);
    }
  );
});

describe('toUtcDayStart', () => {
  it.each`
    date                           | expected
    ${'2026-10-27T00:00:00.000Z'}  | ${'2026-10-27T00:00:00.000Z'}
    ${'2026-10-27T09:30:00.000Z'}  | ${'2026-10-27T00:00:00.000Z'}
    ${'2026-12-31T23:59:59.999Z'}  | ${'2026-12-31T00:00:00.000Z'}
    ${'2026-03-29T01:30:00+02:00'} | ${'2026-03-28T00:00:00.000Z'}
  `('should return $expected for $date', ({ date, expected }) => {
    expect(new Date(toUtcDayStart(new Date(date))).toISOString()).toBe(
      expected
    );
  });
});

describe('toFiniteNumber', () => {
  it.each([0, 12.5, -3, 8589934592])('should return %s as is', (input) => {
    expect(toFiniteNumber(input)).toBe(input);
  });

  it.each`
    case                  | input
    ${'NaN'}              | ${NaN}
    ${'Infinity'}         | ${Infinity}
    ${'-Infinity'}        | ${-Infinity}
    ${'a numeric string'} | ${'12.5'}
    ${'null'}             | ${null}
    ${'undefined'}        | ${undefined}
  `('should return null for $case', ({ input }) => {
    expect(toFiniteNumber(input)).toBeNull();
  });
});

describe('percentToRatio', () => {
  it.each`
    percent   | ratio
    ${0}      | ${0}
    ${12.5}   | ${0.125}
    ${99.9}   | ${0.999}
    ${99.975} | ${0.99975}
    ${100}    | ${1}
    ${150}    | ${1.5}
  `('should return $ratio for $percent %', ({ percent, ratio }) => {
    expect(percentToRatio(percent)).toBe(ratio);
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
