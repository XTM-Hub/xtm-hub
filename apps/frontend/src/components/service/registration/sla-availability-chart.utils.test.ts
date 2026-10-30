import {
  isBeforeSlaTracking,
  slaMissingDayReason,
  slaStatus,
  toSlaMonths,
} from '@/components/service/registration/sla-availability-chart.utils';
import { SaasPlatformSla } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

const TARGET = 0.9998;

const monthlySla = (
  month: string,
  availability: number | null
): SaasPlatformSla['months'][number] => ({ month, availability, days: [] });

describe('isBeforeSlaTracking', () => {
  it.each`
    case                          | date                          | expected
    ${'the day before it starts'} | ${'2026-09-08T00:00:00.000Z'} | ${true}
    ${'the day it starts'}        | ${'2026-09-09T00:00:00.000Z'} | ${false}
    ${'a later day'}              | ${'2026-10-01T00:00:00.000Z'} | ${false}
  `(
    'should tell whether $case is before the availability tracking',
    ({ date, expected }) => {
      // Given / When
      const result = isBeforeSlaTracking(new Date(date));

      // Then
      expect(result).toBe(expected);
    }
  );
});

describe('slaMissingDayReason', () => {
  const NOW = new Date('2026-10-02T12:00:00.000Z');

  it.each`
    case                                  | date                          | reason
    ${'before the availability tracking'} | ${'2026-09-08T00:00:00.000Z'} | ${'NotTrackedYet'}
    ${'past and since the tracking'}      | ${'2026-10-01T00:00:00.000Z'} | ${'NoData'}
    ${'today, not over yet'}              | ${'2026-10-02T00:00:00.000Z'} | ${'Upcoming'}
    ${'still to come'}                    | ${'2026-10-03T00:00:00.000Z'} | ${'Upcoming'}
  `('should tell why a day $case has no value', ({ date, reason }) => {
    // Given / When
    const result = slaMissingDayReason(new Date(date), NOW);

    // Then
    expect(result).toBe(reason);
  });
});

describe('slaStatus', () => {
  it.each`
    case                       | availability | status
    ${'above the target'}      | ${1}         | ${'Met'}
    ${'exactly on the target'} | ${0.9998}    | ${'Met'}
    ${'displayed as 99.98 %'}  | ${0.99975}   | ${'Met'}
    ${'displayed as 99.97 %'}  | ${0.99974}   | ${'Missed'}
    ${'down'}                  | ${0}         | ${'Missed'}
    ${'unmeasured'}            | ${null}      | ${'Unknown'}
  `(
    'should rate a $availability availability $case as $status',
    ({ availability, status }) => {
      // Given / When
      const rated = slaStatus(availability, TARGET);

      // Then
      expect(rated).toBe(status);
    }
  );
});

describe('toSlaMonths', () => {
  it('should rate each month and day against the target and flag the last month as the current one', () => {
    // Given
    const sla: SaasPlatformSla = {
      target: TARGET,
      months: [
        {
          month: '2026-09-01T00:00:00.000Z',
          availability: 0.9992,
          days: [{ day: '2026-09-01T00:00:00.000Z', availability: 0.9992 }],
        },
        {
          month: '2026-10-01T00:00:00.000Z',
          availability: 1,
          days: [
            { day: '2026-10-01T00:00:00.000Z', availability: 1 },
            { day: '2026-10-02T00:00:00.000Z', availability: null },
          ],
        },
      ],
    };

    // When
    const months = toSlaMonths(sla);

    // Then
    expect(months).toEqual([
      {
        start: new Date('2026-09-01T00:00:00.000Z'),
        availability: 0.9992,
        status: 'Missed',
        isCurrent: false,
        days: [
          {
            date: new Date('2026-09-01T00:00:00.000Z'),
            availability: 0.9992,
            status: 'Missed',
          },
        ],
      },
      {
        start: new Date('2026-10-01T00:00:00.000Z'),
        availability: 1,
        status: 'Met',
        isCurrent: true,
        days: [
          {
            date: new Date('2026-10-01T00:00:00.000Z'),
            availability: 1,
            status: 'Met',
          },
          {
            date: new Date('2026-10-02T00:00:00.000Z'),
            availability: null,
            status: 'Unknown',
          },
        ],
      },
    ]);
  });

  it('should flag the only month as the current one', () => {
    // Given
    const sla: SaasPlatformSla = {
      target: TARGET,
      months: [monthlySla('2026-10-01T00:00:00.000Z', null)],
    };

    // When
    const months = toSlaMonths(sla);

    // Then
    expect(months.map(({ isCurrent }) => isCurrent)).toEqual([true]);
  });
});
