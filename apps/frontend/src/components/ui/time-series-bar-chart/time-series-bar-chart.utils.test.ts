import { describe, expect, it } from 'vitest';
import { findPeakValue, toChartData } from './time-series-bar-chart.utils';

const basePoints = [
  { timestamp: '2026-09-22T09:00:00.000Z', value: 1_000 },
  { timestamp: '2026-09-22T10:00:00.000Z', value: 2_000 },
];

describe('toChartData', () => {
  it('should turn each point into a timestamp and value pair, keeping the missing values as gaps', () => {
    expect(
      toChartData([
        { timestamp: '2026-09-22T09:00:00.000Z', value: 1_000 },
        { timestamp: '2026-09-22T10:00:00.000Z', value: null },
      ])
    ).toEqual([
      [Date.parse('2026-09-22T09:00:00.000Z'), 1_000],
      [Date.parse('2026-09-22T10:00:00.000Z'), null],
    ]);
  });
});

describe('findPeakValue', () => {
  it.each`
    case                           | points                                                                                                                                                                         | expected
    ${'the peak is in the middle'} | ${[{ timestamp: '2026-09-22T09:00:00.000Z', value: 1_000 }, { timestamp: '2026-09-22T10:00:00.000Z', value: 3_000 }, { timestamp: '2026-09-22T11:00:00.000Z', value: 2_000 }]} | ${3_000}
    ${'some points have no value'} | ${[{ timestamp: '2026-09-22T09:00:00.000Z', value: null }, ...basePoints]}                                                                                                     | ${2_000}
    ${'every value is zero'}       | ${[{ timestamp: '2026-09-22T09:00:00.000Z', value: 0 }]}                                                                                                                       | ${0}
    ${'no point has a value'}      | ${[{ timestamp: '2026-09-22T09:00:00.000Z', value: null }]}                                                                                                                    | ${null}
    ${'there are no points'}       | ${[]}                                                                                                                                                                          | ${null}
  `('should return $expected when $case', ({ points, expected }) => {
    expect(findPeakValue(points)).toBe(expected);
  });
});
