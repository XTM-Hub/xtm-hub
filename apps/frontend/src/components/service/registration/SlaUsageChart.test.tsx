import { SlaUsageChart } from '@/components/service/registration/SlaUsageChart';
import testRender from '@/utils/test/test-render';
import {
  SaasPlatformMetricPoint,
  SaasPlatformMetricsPeriod,
} from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-10-27T09:00:00.000Z');

const points: SaasPlatformMetricPoint[] = [
  { timestamp: '2026-10-01T12:00:00.000Z', value: 1 },
  { timestamp: '2026-10-02T12:00:00.000Z', value: 0.9991 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SlaUsageChart', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display the availability title and subtitle', () => {
    // Given / When
    testRender(
      <SlaUsageChart
        points={points}
        period={SaasPlatformMetricsPeriod.Last_30Days}
      />
    );

    // Then
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Register.Metrics.SLA.Title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Register.Metrics.SLA.Subtitle')
    ).toBeInTheDocument();
  });

  it.each`
    status       | colorClass
    ${'Met'}     | ${'bg-feedback-success-primary'}
    ${'Missed'}  | ${'bg-feedback-alert-primary'}
    ${'Unknown'} | ${'bg-feedback-neutral-primary'}
  `(
    'should display a $colorClass dot in the legend for the $status days',
    ({ status, colorClass }) => {
      // Given / When
      testRender(
        <SlaUsageChart
          points={points}
          period={SaasPlatformMetricsPeriod.Last_30Days}
        />
      );

      // Then
      const entry = screen.getByText(`Register.Metrics.SLA.Legend.${status}`);
      expect(entry.querySelector('[aria-hidden="true"]')).toHaveClass(
        colorClass
      );
    }
  );

  it('should display a bar per day of the current month, green above the target, amber below and grey without value', () => {
    // Given / When
    testRender(
      <SlaUsageChart
        points={points}
        period={SaasPlatformMetricsPeriod.Last_30Days}
      />
    );

    // Then
    const month = screen.getByRole('list', {
      name: 'Register.Metrics.SLA.MonthRange',
    });
    const days = within(month).getAllByRole('listitem');
    expect(days).toHaveLength(31);
    expect(days[0]).toHaveClass('bg-feedback-success-primary');
    expect(days[1]).toHaveClass('bg-feedback-alert-primary');
    expect(days[2]).toHaveClass('bg-feedback-neutral-primary');
    expect(days[30]).toHaveClass('bg-feedback-neutral-primary');
  });

  it.each`
    case                  | dayIndex | date       | status
    ${'above the target'} | ${0}     | ${'Oct 1'} | ${'Register.Metrics.SLA.OnTarget'}
    ${'below the target'} | ${1}     | ${'Oct 2'} | ${'Register.Metrics.SLA.BelowTarget'}
    ${'without value'}    | ${2}     | ${'Oct 3'} | ${'Register.Metrics.SLA.NoData'}
  `(
    'should show the date then the availability of a day $case in a tooltip on hover',
    async ({ dayIndex, date, status }) => {
      // Given
      const user = userEvent.setup();
      testRender(
        <SlaUsageChart
          points={points}
          period={SaasPlatformMetricsPeriod.Last_30Days}
        />
      );
      const day = screen.getAllByRole('listitem')[dayIndex];

      // When
      await user.hover(day!);

      // Then
      const lines = within(await screen.findByRole('tooltip')).getAllByText(
        /.+/,
        { selector: 'span' }
      );
      expect(lines.map((line) => line.textContent)).toEqual([date, status]);
    }
  );

  it('should display the last three whole months, the current one to date', () => {
    // Given / When
    testRender(
      <SlaUsageChart
        points={points}
        period={SaasPlatformMetricsPeriod.Last_90Days}
      />
    );

    // Then
    const months = screen.getAllByRole('list');
    expect(
      months.map((month) => within(month).getAllByRole('listitem').length)
    ).toEqual([31, 30, 31]);
    expect(screen.getByText('Aug')).toBeInTheDocument();
    expect(screen.getByText('Sep')).toBeInTheDocument();
    expect(
      screen.getByText('Register.Metrics.SLA.MonthToDate')
    ).toBeInTheDocument();
  });
});
