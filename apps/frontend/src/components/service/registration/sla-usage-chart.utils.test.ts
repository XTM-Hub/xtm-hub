import {
  averageAvailabilityByDay,
  buildSlaMonths,
  slaDayStatus,
} from '@/components/service/registration/sla-usage-chart.utils';
import { SaasPlatformMetricsPeriod } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-10-27T09:00:00.000Z');

describe('slaDayStatus', () => {
  it.each`
    availability | status
    ${1}         | ${'Met'}
    ${0.99981}   | ${'Met'}
    ${0.9998}    | ${'Missed'}
    ${0}         | ${'Missed'}
    ${null}      | ${'Unknown'}
  `(
    'should rate a $availability availability as $status',
    ({ availability, status }) => {
      expect(slaDayStatus(availability)).toBe(status);
    }
  );
});

describe('averageAvailabilityByDay', () => {
  it('should average the points of each UTC day, skipping the missing values', () => {
    // Given
    const points = [
      { timestamp: '2026-10-01T00:00:00.000Z', value: 1 },
      { timestamp: '2026-10-01T23:00:00.000Z', value: 0.5 },
      { timestamp: '2026-10-02T10:00:00.000Z', value: null },
      { timestamp: '2026-10-03T10:00:00.000Z', value: 0.9999 },
    ];

    // When
    const availabilityByDay = averageAvailabilityByDay(points);

    // Then
    expect(Object.fromEntries(availabilityByDay)).toEqual({
      '2026-10-01': 0.75,
      '2026-10-03': 0.9999,
    });
  });
});

describe('buildSlaMonths', () => {
  it.each`
    period                                   | months
    ${SaasPlatformMetricsPeriod.Last_7Days}  | ${[['2026-10-01', 31]]}
    ${SaasPlatformMetricsPeriod.Last_30Days} | ${[['2026-10-01', 31]]}
    ${SaasPlatformMetricsPeriod.Last_90Days} | ${[['2026-08-01', 31], ['2026-09-01', 30], ['2026-10-01', 31]]}
  `(
    'should cover whole calendar months up to the current one for $period',
    ({ period, months }) => {
      // Given / When
      const slaMonths = buildSlaMonths([], period, NOW);

      // Then
      expect(
        slaMonths.map(({ start, days }) => [
          start.toISOString().slice(0, 10),
          days.length,
        ])
      ).toEqual(months);
      expect(slaMonths.map(({ isCurrent }) => isCurrent)).toEqual(
        months.map((_: unknown, index: number) => index === months.length - 1)
      );
    }
  );

  it('should carry the months over to the previous year', () => {
    // Given / When
    const slaMonths = buildSlaMonths(
      [],
      SaasPlatformMetricsPeriod.Last_90Days,
      new Date('2027-01-15T00:00:00.000Z')
    );

    // Then
    expect(slaMonths.map(({ start }) => start.toISOString())).toEqual([
      '2026-11-01T00:00:00.000Z',
      '2026-12-01T00:00:00.000Z',
      '2027-01-01T00:00:00.000Z',
    ]);
  });

  it('should rate each day from its points and leave the days without any as unknown', () => {
    // Given
    const points = [
      { timestamp: '2026-10-01T12:00:00.000Z', value: 1 },
      { timestamp: '2026-10-02T12:00:00.000Z', value: 0.99 },
    ];

    // When
    const [october] = buildSlaMonths(
      points,
      SaasPlatformMetricsPeriod.Last_30Days,
      NOW
    );

    // Then
    expect(october?.days.slice(0, 3)).toEqual([
      {
        date: new Date('2026-10-01T00:00:00.000Z'),
        availability: 1,
        status: 'Met',
      },
      {
        date: new Date('2026-10-02T00:00:00.000Z'),
        availability: 0.99,
        status: 'Missed',
      },
      {
        date: new Date('2026-10-03T00:00:00.000Z'),
        availability: null,
        status: 'Unknown',
      },
    ]);
    expect(october?.end).toEqual(new Date('2026-10-31T00:00:00.000Z'));
  });
});
