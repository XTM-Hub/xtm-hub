import { PlatformMetricsPeriodSelector } from '@/components/service/registration/PlatformMetricsPeriodSelector';
import testRender from '@/utils/test/test-render';
import { SaasPlatformMetricsPeriod } from '@graphql/generated';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const periodRadioName = (period: SaasPlatformMetricsPeriod) =>
  `Register.Metrics.Period.${period}`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlatformMetricsPeriodSelector', () => {
  it('should offer the 7, 30 and 90 days periods in a labelled group', () => {
    // Given / When
    testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    const group = screen.getByRole('radiogroup', {
      name: 'Register.Metrics.Period.Label',
    });
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent)
    ).toEqual([
      periodRadioName(SaasPlatformMetricsPeriod.Last_30Days),
      periodRadioName(SaasPlatformMetricsPeriod.Last_90Days),
      periodRadioName(SaasPlatformMetricsPeriod.Last_180Days),
    ]);
  });

  it.each`
    period                                    | days
    ${SaasPlatformMetricsPeriod.Last_30Days}  | ${30}
    ${SaasPlatformMetricsPeriod.Last_90Days}  | ${90}
    ${SaasPlatformMetricsPeriod.Last_180Days} | ${180}
  `(
    'should check only the $days days radio when the period is $period',
    ({ period }) => {
      // Given / When
      testRender(
        <PlatformMetricsPeriodSelector
          period={period}
          onPeriodChange={vi.fn()}
        />
      );

      // Then
      expect(screen.getByRole('radio', { checked: true })).toHaveAccessibleName(
        periodRadioName(period)
      );
      expect(screen.getAllByRole('radio', { checked: false })).toHaveLength(2);
    }
  );

  it('should notify the period of the radio clicked', async () => {
    // Given
    const onPeriodChange = vi.fn();
    const { user } = testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={onPeriodChange}
      />
    );

    // When
    await user.click(
      screen.getByRole('radio', {
        name: periodRadioName(SaasPlatformMetricsPeriod.Last_30Days),
      })
    );

    // Then
    expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith(
      SaasPlatformMetricsPeriod.Last_30Days
    );
  });

  it('should disable the 180 days period with a coming soon tooltip', async () => {
    // Given
    const { user } = testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );
    const radio = screen.getByRole('radio', {
      name: periodRadioName(SaasPlatformMetricsPeriod.Last_180Days),
    });

    // When
    await user.hover(radio);

    // Then
    expect(radio).toHaveAttribute('aria-disabled', 'true');
    expect(
      await screen.findByRole('tooltip', {
        name: 'Register.Metrics.Period.ComingSoon',
      })
    ).toBeInTheDocument();
  });

  it('should not notify a change when the selected period is clicked again', async () => {
    // Given
    const onPeriodChange = vi.fn();
    const { user } = testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={onPeriodChange}
      />
    );

    // When
    await user.click(
      screen.getByRole('radio', {
        name: periodRadioName(SaasPlatformMetricsPeriod.Last_30Days),
      })
    );

    // Then
    expect(onPeriodChange).not.toHaveBeenCalled();
  });

  it('should notify the next period when the arrow key moves to it', async () => {
    // Given
    const onPeriodChange = vi.fn();
    const { user } = testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={onPeriodChange}
      />
    );
    await user.tab();

    // When
    await user.keyboard('{ArrowRight}');

    // Then
    expect(
      screen.getByRole('radio', {
        name: periodRadioName(SaasPlatformMetricsPeriod.Last_90Days),
      })
    ).toHaveFocus();
    expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith(
      SaasPlatformMetricsPeriod.Last_90Days
    );
  });

  it('should disable every period when disabled', () => {
    // Given / When
    testRender(
      <PlatformMetricsPeriodSelector
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
        disabled
      />
    );

    // Then
    screen.getAllByRole('radio').forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });
});
