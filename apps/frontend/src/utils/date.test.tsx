import {
  computePeriodProgress,
  isWithinLastMonths,
  useDateFormatter,
} from '@/utils/date';
import { ProvidersWrapperProps, TestWrapper } from '@/utils/test/test-render';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('useDateFormatter', () => {
  const wrapper = ({ children }: ProvidersWrapperProps) => (
    <TestWrapper>{children}</TestWrapper>
  );

  it('should return formatted date for valid input', () => {
    const { result } = renderHook(() => useDateFormatter(), { wrapper });
    expect(result.current('2024-11-08T10:20:30Z')).toBe('11/8/2024');
  });

  it.each`
    input        | description
    ${undefined} | ${'undefined'}
    ${''}        | ${'empty string'}
    ${null}      | ${'null'}
  `('should return null for $description input', ({ input }) => {
    const { result } = renderHook(() => useDateFormatter(), { wrapper });
    expect(result.current(input)).toBe(null);
  });
});

describe('isWithinLastMonths', () => {
  it.each([
    { label: '1 month ago', monthsAgo: 1, months: 3, expected: true },
    { label: '2 months ago', monthsAgo: 2, months: 3, expected: true },
    { label: '4 months ago', monthsAgo: 4, months: 3, expected: false },
    { label: '6 months ago', monthsAgo: 6, months: 3, expected: false },
    { label: 'today', monthsAgo: 0, months: 3, expected: true },
    {
      label: '1 month ago within 1 month',
      monthsAgo: 1,
      months: 1,
      expected: false,
    },
  ])(
    '$label (within $months months) should return $expected',
    ({ monthsAgo, months, expected }) => {
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);
      expect(isWithinLastMonths(date, months)).toBe(expected);
    }
  );
});

describe('computePeriodProgress', () => {
  const startDate = '2026-01-01T00:00:00.000Z';
  const endDate = '2026-01-11T00:00:00.000Z';

  it.each`
    description           | now                           | daysLeft | elapsedPercent
    ${'before the start'} | ${'2025-12-25T00:00:00.000Z'} | ${10}    | ${0}
    ${'at the start'}     | ${'2026-01-01T00:00:00.000Z'} | ${10}    | ${0}
    ${'midway'}           | ${'2026-01-06T00:00:00.000Z'} | ${5}     | ${50}
    ${'mid-day'}          | ${'2026-01-08T12:00:00.000Z'} | ${3}     | ${70}
    ${'at the end'}       | ${'2026-01-11T00:00:00.000Z'} | ${0}     | ${100}
    ${'after the end'}    | ${'2026-02-01T00:00:00.000Z'} | ${0}     | ${100}
  `(
    'should return $daysLeft days left and $elapsedPercent% elapsed $description',
    ({ now, daysLeft, elapsedPercent }) => {
      expect(computePeriodProgress(startDate, endDate, new Date(now))).toEqual({
        totalDays: 10,
        daysLeft,
        elapsedPercent,
      });
    }
  );

  it('should consider a zero-length period as fully elapsed', () => {
    expect(
      computePeriodProgress(startDate, startDate, new Date(startDate))
    ).toEqual({ totalDays: 0, daysLeft: 0, elapsedPercent: 100 });
  });
});
