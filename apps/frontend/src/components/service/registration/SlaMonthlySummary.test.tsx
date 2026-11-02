import { toSlaMonths } from '@/components/service/registration/sla-availability-chart.utils';
import { SlaMonthlySummary } from '@/components/service/registration/SlaMonthlySummary';
import testRender from '@/utils/test/test-render';
import { SaasPlatformMonthlySla } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TARGET = 0.9998;

// The 31 days of October 2026, the first ones with the given availabilities.
const octoberDays = (availabilities: (number | null)[] = []) =>
  Array.from({ length: 31 }, (_, index) => ({
    day: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    availability: availabilities[index] ?? null,
  }));

const sla: SaasPlatformMonthlySla[] = [
  { month: '2026-08-01T00:00:00.000Z', availability: 0.9992, days: [] },
  { month: '2026-09-01T00:00:00.000Z', availability: 0.9999, days: [] },
  {
    month: '2026-10-01T00:00:00.000Z',
    availability: 0.9997,
    days: octoberDays([0.9997]),
  },
];

const renderSummary = (months: SaasPlatformMonthlySla[]) =>
  testRender(
    <SlaMonthlySummary
      months={toSlaMonths({ target: TARGET, months })}
      target={TARGET}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SlaMonthlySummary', () => {
  beforeEach(() => {
    // Show the values each message is given, to prove them.
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
  });

  it('should display the title with the target', () => {
    // Given / When
    renderSummary(sla);

    // Then
    expect(
      screen.getByText('Register.Metrics.SLA.Summary.Title:{"target":"99.98%"}')
    ).toBeInTheDocument();
  });

  it('should list the months from the most recent, with their availability and a dot of their status', () => {
    // Given / When
    renderSummary(sla);

    // Then
    const terms = screen.getAllByRole('term');
    expect(terms.map(({ textContent }) => textContent)).toEqual([
      'Register.Metrics.SLA.MonthToDate:{"month":"October 2026"}',
      'September 2026',
      'August 2026',
    ]);
    const details = screen.getAllByRole('definition');
    expect(details.map(({ textContent }) => textContent)).toEqual([
      '99.97%Register.Metrics.SLA.Legend.Missed',
      '99.99%Register.Metrics.SLA.Legend.Met',
      '99.92%Register.Metrics.SLA.Legend.Missed',
    ]);
    expect(
      details.map(
        (detail) =>
          detail.querySelector('[aria-hidden="true"]')?.className ?? ''
      )
    ).toEqual([
      expect.stringContaining('bg-feedback-alert-primary'),
      expect.stringContaining('bg-feedback-success-primary'),
      expect.stringContaining('bg-feedback-alert-primary'),
    ]);
  });

  it('should display no data for a past month without any value', () => {
    // Given / When
    renderSummary([
      { month: '2026-09-01T00:00:00.000Z', availability: null, days: [] },
      { month: '2026-10-01T00:00:00.000Z', availability: 1, days: [] },
    ]);

    // Then
    expect(screen.getAllByRole('definition')[1]).toHaveTextContent(
      'Register.Metrics.SLA.NoData'
    );
  });

  describe('with a single month', () => {
    it.each`
      case                  | availability | percentage  | chip
      ${'above the target'} | ${0.9999}    | ${'99.99%'} | ${'Register.Metrics.SLA.Legend.Met'}
      ${'on the target'}    | ${0.99975}   | ${'99.98%'} | ${'Register.Metrics.SLA.Legend.Met'}
      ${'below the target'} | ${0.9997}    | ${'99.97%'} | ${'Register.Metrics.SLA.Legend.Missed'}
    `(
      'should display the month to date, its availability $case and its status',
      ({ availability, percentage, chip }) => {
        // Given / When
        renderSummary([
          {
            month: '2026-10-01T00:00:00.000Z',
            availability,
            days: octoberDays(),
          },
        ]);

        // Then
        expect(
          screen.getByText(
            'Register.Metrics.SLA.Summary.CurrentMonth:{"month":"October 2026"}'
          )
        ).toBeInTheDocument();
        expect(screen.getByText(percentage)).toBeInTheDocument();
        expect(screen.getByText(chip)).toBeInTheDocument();
        expect(screen.queryByRole('term')).not.toBeInTheDocument();
      }
    );

    it('should display the target and the days measured out of the days of the month', () => {
      // Given / When
      renderSummary([
        {
          month: '2026-10-01T00:00:00.000Z',
          availability: 1,
          days: octoberDays([1, null, 0.9991]),
        },
      ]);

      // Then
      expect(
        screen.getByText(
          'Register.Metrics.SLA.Summary.TargetAndMeasuredDays:{"target":"99.98%","measured":2,"total":31}'
        )
      ).toBeInTheDocument();
    });

    it('should display no data without a status for a month without any value', () => {
      // Given / When
      renderSummary([
        {
          month: '2026-10-01T00:00:00.000Z',
          availability: null,
          days: octoberDays(),
        },
      ]);

      // Then
      expect(
        screen.getByText('Register.Metrics.SLA.NoData')
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/Register\.Metrics\.SLA\.Legend\./)
      ).not.toBeInTheDocument();
    });
  });
});
