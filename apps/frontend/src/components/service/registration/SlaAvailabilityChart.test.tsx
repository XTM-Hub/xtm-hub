import { SlaAvailabilityChart } from '@/components/service/registration/SlaAvailabilityChart';
import testRender from '@/utils/test/test-render';
import { SaasPlatformMonthlySla, SaasPlatformSla } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TARGET = 0.9998;

// Every day of a UTC month, as the backend sends them, the first ones with the given availabilities.
const monthlySla = (
  year: number,
  month: number,
  availabilities: (number | null)[] = []
): SaasPlatformMonthlySla => {
  const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    month: new Date(Date.UTC(year, month, 1)).toISOString(),
    availability: availabilities.find((value) => value !== null) ?? null,
    days: Array.from({ length: dayCount }, (_, index) => ({
      day: new Date(Date.UTC(year, month, index + 1)).toISOString(),
      availability: availabilities[index] ?? null,
    })),
  };
};

const singleMonthSla: SaasPlatformSla = {
  target: TARGET,
  months: [monthlySla(2026, 9, [1, 0.9991])],
};

const threeMonthsSla: SaasPlatformSla = {
  target: TARGET,
  months: [
    monthlySla(2026, 7, [1]),
    monthlySla(2026, 8, [0.9991]),
    monthlySla(2026, 9, [1, 0.9991]),
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getBar = (index: number): HTMLElement => {
  const bar = screen.getAllByRole('listitem').at(index);
  if (!bar) {
    throw new Error(`No bar at index ${index}`);
  }
  return bar;
};

// The tooltip is a visual copy of the bars' sr-only text, out of the accessibility tree.
const queryTooltip = () => screen.queryByRole('tooltip', { hidden: true });

const tooltipLines = async () =>
  within(await screen.findByRole('tooltip', { hidden: true }))
    .getAllByText(/.+/, { selector: 'span' })
    .map(({ textContent }) => textContent);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SlaAvailabilityChart', () => {
  it('should display the availability title and subtitle', () => {
    // Given / When
    testRender(<SlaAvailabilityChart sla={singleMonthSla} />);

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
      testRender(<SlaAvailabilityChart sla={singleMonthSla} />);

      // Then
      const entry = screen.getByText(`Register.Metrics.SLA.Legend.${status}`, {
        selector: 'figcaption span',
      });
      expect(entry.querySelector('[aria-hidden="true"]')).toHaveClass(
        colorClass
      );
    }
  );

  it('should display the monthly summary next to the bars', () => {
    // Given / When
    const { container } = testRender(
      <SlaAvailabilityChart sla={threeMonthsSla} />
    );

    // Then
    expect(
      screen.getByText('Register.Metrics.SLA.Summary.Title')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('term')).toHaveLength(3);
    expect(
      container.querySelector('[data-orientation="vertical"]')
    ).toBeInTheDocument();
  });

  it('should display a bar per day of a single month, green on target, amber below and grey without value', () => {
    // Given / When
    testRender(<SlaAvailabilityChart sla={singleMonthSla} />);

    // Then
    const month = screen.getByRole('list', {
      name: 'Register.Metrics.SLA.MonthRange',
    });
    const days = within(month).getAllByRole('listitem');
    expect(days).toHaveLength(31);
    expect(getBar(0)).toHaveClass('bg-feedback-success-primary');
    expect(getBar(1)).toHaveClass('bg-feedback-alert-primary');
    expect(getBar(2)).toHaveClass('bg-feedback-neutral-primary');
    expect(getBar(30)).toHaveClass('bg-feedback-neutral-primary');
  });

  it('should display the months the backend sends, the last one to date', () => {
    // Given / When
    testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);

    // Then
    const months = screen.getAllByRole('list');
    expect(
      months.map((month) => within(month).getAllByRole('listitem').length)
    ).toEqual([31, 30, 31]);
    expect(months.map((month) => month.getAttribute('aria-label'))).toEqual([
      'Aug',
      'Sep',
      'Register.Metrics.SLA.MonthToDate',
    ]);
  });

  it('should display the same months in the bars and in the summary, with the same current month', () => {
    // Given
    vi.mocked(useTranslations).mockReturnValue((key, values) =>
      values ? `${key}:${JSON.stringify(values)}` : key
    );
    // A current month other than today's: the backend alone decides it.
    const sla: SaasPlatformSla = {
      target: TARGET,
      months: [monthlySla(2026, 4, [1]), monthlySla(2026, 5, [0.9991])],
    };

    // When
    testRender(<SlaAvailabilityChart sla={sla} />);

    // Then
    expect(
      screen
        .getAllByRole('list')
        .map((month) => month.getAttribute('aria-label'))
    ).toEqual(['May', 'Register.Metrics.SLA.MonthToDate:{"month":"Jun"}']);
    expect(
      screen
        .getAllByRole('term')
        .map(({ textContent }) => textContent)
        .reverse()
    ).toEqual([
      'May 2026',
      'Register.Metrics.SLA.MonthToDate:{"month":"June 2026"}',
    ]);
  });

  describe('tooltip', () => {
    beforeEach(() => {
      // Only Date is faked: a day without value reads by the clock, but user-event still needs the real timers.
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime('2026-10-02T12:00:00.000Z');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each`
      case                  | dayIndex | date       | status
      ${'on the target'}    | ${0}     | ${'Oct 1'} | ${'Register.Metrics.SLA.OnTarget'}
      ${'below the target'} | ${1}     | ${'Oct 2'} | ${'Register.Metrics.SLA.BelowTarget'}
      ${'still to come'}    | ${2}     | ${'Oct 3'} | ${'Register.Metrics.SLA.Legend.Unknown'}
    `(
      'should show the date then the availability of a day $case on hover',
      async ({ dayIndex, date, status }) => {
        // Given
        const user = userEvent.setup();
        testRender(<SlaAvailabilityChart sla={singleMonthSla} />);

        // When
        await user.hover(getBar(dayIndex));

        // Then
        expect(await tooltipLines()).toEqual([date, status]);
        expect(getBar(dayIndex)).toHaveClass('outline-focus');
      }
    );

    it.each`
      case                                  | barIndex | date       | status
      ${'before the availability tracking'} | ${38}    | ${'Sep 8'} | ${'Register.Metrics.SLA.NotTrackedYet'}
      ${'past and since the tracking'}      | ${39}    | ${'Sep 9'} | ${'Register.Metrics.SLA.NoData'}
    `(
      'should show why a day $case has no value on hover',
      async ({ barIndex, date, status }) => {
        // Given
        const user = userEvent.setup();
        testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);

        // When
        await user.hover(getBar(barIndex));

        // Then
        expect(await tooltipLines()).toEqual([date, status]);
      }
    );

    it('should move the single tooltip to the bar under the pointer', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);
      await user.hover(getBar(0));

      // When
      await user.hover(getBar(31));

      // Then
      expect(await tooltipLines()).toEqual([
        'Sep 1',
        'Register.Metrics.SLA.BelowTarget',
      ]);
      expect(screen.getAllByRole('tooltip', { hidden: true }).length).toBe(1);
      expect(getBar(0)).not.toHaveClass('outline-focus');
    });

    it('should hide the tooltip from assistive technologies', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={singleMonthSla} />);

      // When
      await user.hover(getBar(0));

      // Then
      expect(
        (await screen.findByRole('tooltip', { hidden: true })).closest(
          '[aria-hidden="true"]'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should close the tooltip when the pointer leaves the bars', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={singleMonthSla} />);
      await user.hover(getBar(0));
      await screen.findByRole('tooltip', { hidden: true });

      // When
      await user.unhover(getBar(0));

      // Then
      expect(queryTooltip()).not.toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('should focus a month and show its first day', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);

      // When
      await user.tab();

      // Then
      expect(screen.getByRole('list', { name: 'Aug' })).toHaveFocus();
      expect(await tooltipLines()).toEqual([
        'Aug 1',
        'Register.Metrics.SLA.OnTarget',
      ]);
    });

    it.each`
      keys                         | date
      ${'{ArrowRight}'}            | ${'Aug 2'}
      ${'{ArrowRight}{ArrowLeft}'} | ${'Aug 1'}
      ${'{ArrowLeft}'}             | ${'Aug 1'}
      ${'{End}'}                   | ${'Aug 31'}
      ${'{End}{ArrowRight}'}       | ${'Aug 31'}
      ${'{End}{Home}'}             | ${'Aug 1'}
    `(
      'should show $date after $keys within the focused month',
      async ({ keys, date }) => {
        // Given
        const user = userEvent.setup();
        testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);
        await user.tab();

        // When
        await user.keyboard(keys);

        // Then
        const [shownDate] = await tooltipLines();
        expect(shownDate).toBe(date);
      }
    );

    it('should move to the first day of the next month on Tab', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);
      await user.tab();
      await user.keyboard('{ArrowRight}');

      // When
      await user.tab();

      // Then
      expect(screen.getByRole('list', { name: 'Sep' })).toHaveFocus();
      const [shownDate] = await tooltipLines();
      expect(shownDate).toBe('Sep 1');
      expect(getBar(31)).toHaveClass('outline-focus');
    });

    it('should close the tooltip on Escape', async () => {
      // Given
      const user = userEvent.setup();
      testRender(<SlaAvailabilityChart sla={threeMonthsSla} />);
      await user.tab();
      await screen.findByRole('tooltip', { hidden: true });

      // When
      await user.keyboard('{Escape}');

      // Then
      expect(queryTooltip()).not.toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Aug' })).toHaveFocus();
    });
  });
});
