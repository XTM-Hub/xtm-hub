import {
  countFullMonthsOnTarget,
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

describe('countFullMonthsOnTarget', () => {
  it('should count the past months with a value, and those on target among them', () => {
    // Given
    const months = toSlaMonths({
      target: TARGET,
      months: [
        monthlySla('2026-06-01T00:00:00.000Z', null),
        monthlySla('2026-07-01T00:00:00.000Z', 1),
        monthlySla('2026-08-01T00:00:00.000Z', 0.9992),
        monthlySla('2026-09-01T00:00:00.000Z', 0.9999),
        monthlySla('2026-10-01T00:00:00.000Z', 1),
      ],
    });

    // When
    const count = countFullMonthsOnTarget(months);

    // Then
    expect(count).toEqual({ met: 2, total: 3 });
  });

  it('should count no full month when only the current month is known', () => {
    // Given
    const months = toSlaMonths({
      target: TARGET,
      months: [monthlySla('2026-10-01T00:00:00.000Z', 1)],
    });

    // When
    const count = countFullMonthsOnTarget(months);

    // Then
    expect(count).toEqual({ met: 0, total: 0 });
  });
});
