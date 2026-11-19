import { PlatformMetrics } from '@/components/service/registration/PlatformMetrics';
import { revokeAnalyticsConsent } from '@/lib/analytics/analytics.client';
import {
  readTrackedEvents,
  resetAnalyticsEnvironment,
  startAnalytics,
} from '@/utils/test/analytics';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import {
  MetricType,
  PlatformIdentifier,
  SaasPlatformMetrics,
  SaasPlatformMetricsPeriod,
  SaasPlatformResolution,
  SaasPlatformSla,
  SaasPlatformStorage,
} from '@graphql/generated';
import { act, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// jsdom has no SVG layout for ApexCharts to measure: capture what each chart is given instead.
const mocks = vi.hoisted(() => ({ chart: vi.fn() }));

vi.mock('react-apexcharts', () => ({
  default: (props: unknown) => {
    mocks.chart(props);
    return <div data-testid="storage-usage-chart" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const metrics: SaasPlatformMetrics = {
  start: '2026-09-22T12:00:00.000Z',
  end: '2026-10-22T12:00:00.000Z',
  resolution: SaasPlatformResolution.Hour,
  series: [
    {
      metric_type: MetricType.SlaAvailability,
      points: [{ timestamp: '2026-09-22T12:00:00.000Z', value: 1 }],
    },
    {
      metric_type: MetricType.EsUsedSize,
      points: [{ timestamp: '2026-09-22T12:00:00.000Z', value: 1_500_000_000 }],
    },
    {
      metric_type: MetricType.S3UsedSize,
      points: [{ timestamp: '2026-09-22T12:00:00.000Z', value: 4_000_000_000 }],
    },
  ],
};

const storageUsage = { percent: 50, time: '2026-10-22T12:00:00.000Z' };
const storage: Pick<SaasPlatformStorage, 'es_used_size' | 's3_used_size'> = {
  es_used_size: { ...storageUsage, used: 1_500_000_000, limit: 3_000_000_000 },
  s3_used_size: { ...storageUsage, used: 4_000_000_000, limit: 8_000_000_000 },
};

const sla: SaasPlatformSla = {
  target: 0.9998,
  months: [
    {
      month: '2026-10-01T00:00:00.000Z',
      availability: 1,
      days: [{ day: '2026-10-01T00:00:00.000Z', availability: 1 }],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlatformMetrics', () => {
  beforeEach(() => {
    mocks.chart.mockClear();
  });

  it('should display the platform metrics heading', () => {
    // Given / When
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Register.Metrics.Title',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Register.Metrics.Unavailable')
    ).not.toBeInTheDocument();
  });

  it('should display a storage used chart for the es_used_size and the s3_used_size series', async () => {
    // Given / When
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(await screen.findAllByTestId('storage-usage-chart')).toHaveLength(2);
    const chartData = mocks.chart.mock.calls.map(
      ([props]) =>
        (props as { series: { data: [number, number | null][] }[] }).series[0]
          ?.data
    );
    expect(chartData).toEqual(
      expect.arrayContaining([
        [[Date.parse('2026-09-22T12:00:00.000Z'), 1_500_000_000]],
        [[Date.parse('2026-09-22T12:00:00.000Z'), 4_000_000_000]],
      ])
    );
  });

  it.each`
    case             | metrics      | isLoading
    ${'loaded'}      | ${metrics}   | ${false}
    ${'loading'}     | ${undefined} | ${true}
    ${'unavailable'} | ${null}      | ${false}
  `(
    'should display the period selector when the metrics are $case',
    ({ metrics: displayedMetrics, isLoading }) => {
      // Given / When
      testRender(
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={displayedMetrics}
          isLoading={isLoading}
          period={SaasPlatformMetricsPeriod.Last_30Days}
          onPeriodChange={vi.fn()}
        />
      );

      // Then
      expect(
        screen.getByRole('radiogroup', {
          name: 'Register.Metrics.Period.Label',
        })
      ).toBeInTheDocument();
    }
  );

  it('should display the metrics as loading while they are pending', () => {
    // Given / When
    const { container } = testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={undefined}
        isLoading
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      screen.queryByText('Register.Metrics.Unavailable')
    ).not.toBeInTheDocument();
  });

  it('should keep the charts of the previous period on screen, as loading, while another period loads', () => {
    // Given / When
    const { container } = testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        isRefreshing
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    const busySections = container.querySelectorAll('[aria-busy="true"]');
    expect(busySections).toHaveLength(1);
    expect(
      busySections[0]?.querySelectorAll('[data-testid="storage-usage-chart"]')
    ).toHaveLength(2);
  });

  it('should display the metrics as loading while another period loads after metrics that were unavailable', () => {
    // Given / When
    const { container } = testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={null}
        isLoading={false}
        isRefreshing
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      screen.queryByText('Register.Metrics.Unavailable')
    ).not.toBeInTheDocument();
  });

  it('should display the storage of each card when only the metrics series are unavailable', () => {
    // Given / When
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={null}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map(({ textContent }) => textContent)
    ).toEqual(['Register.Metrics.StorageTitle']);
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(2);
    expect(screen.getAllByText('Register.Metrics.UsedOfLimit')).toHaveLength(2);
  });

  it('should display the SLA section when the SLA is known', () => {
    // Given / When
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        sla={sla}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map(({ textContent }) => textContent)
    ).toEqual(['Register.Metrics.StorageTitle', 'Register.Metrics.SLA.Title']);
  });

  it.each([[null], [undefined]])(
    'should hide the SLA section when the SLA is %s',
    (unknownSla) => {
      // Given / When
      testRender(
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={metrics}
          storage={storage}
          sla={unknownSla}
          isLoading={false}
          period={SaasPlatformMetricsPeriod.Last_30Days}
          onPeriodChange={vi.fn()}
        />
      );

      // Then
      expect(
        screen.queryByRole('heading', { name: 'Register.Metrics.SLA.Title' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    }
  );

  it.each([[null], [undefined]])(
    'should display the metrics as unavailable when they are %s',
    (unavailableMetrics) => {
      // Given / When
      const { container } = testRender(
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={unavailableMetrics}
          isLoading={false}
          period={SaasPlatformMetricsPeriod.Last_90Days}
          onPeriodChange={vi.fn()}
        />
      );

      // Then
      expect(
        screen.getByText('Register.Metrics.Unavailable')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[aria-busy="true"]')
      ).not.toBeInTheDocument();
      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    }
  );

  it.each`
    case                           | isLoading | metricsData  | storageData
    ${'they are loading'}          | ${true}   | ${undefined} | ${undefined}
    ${'they are shown'}            | ${false}  | ${metrics}   | ${storage}
    ${'only the storage is known'} | ${false}  | ${null}      | ${storage}
  `(
    'should keep the period selector enabled when $case',
    ({ isLoading, metricsData, storageData }) => {
      // Given / When
      testRender(
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={metricsData}
          storage={storageData}
          isLoading={isLoading}
          period={SaasPlatformMetricsPeriod.Last_90Days}
          onPeriodChange={vi.fn()}
        />
      );

      // Then
      screen.getAllByRole('radio').forEach((radio) => {
        expect(radio).toBeEnabled();
      });
    }
  );

  it('should send the metrics view once when another period is chosen', () => {
    // Given
    startAnalytics();
    const { rerender } = testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // When
    rerender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_30Days}
        onPeriodChange={vi.fn()}
      />
    );

    // Then
    expect(readTrackedEvents('view_platform_metrics')).toHaveLength(1);
  });

  it('should send the metrics view of the displayed platform and period when analytics is enabled after the metrics were displayed', () => {
    // Given
    resetAnalyticsEnvironment();
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );

    // When
    act(() => startAnalytics());

    // Then
    expect(readTrackedEvents('view_platform_metrics')).toEqual([
      { product: 'OpenCTI', period: 'Last 90 days' },
    ]);
  });

  it('should send the metrics view again when analytics is enabled again after it was withdrawn', () => {
    // Given
    startAnalytics();
    testRender(
      <PlatformMetrics
        platformIdentifier={PlatformIdentifier.Opencti}
        metrics={metrics}
        storage={storage}
        isLoading={false}
        period={SaasPlatformMetricsPeriod.Last_90Days}
        onPeriodChange={vi.fn()}
      />
    );
    act(() => revokeAnalyticsConsent());

    // When
    act(() => startAnalytics());

    // Then
    expect(readTrackedEvents('view_platform_metrics')).toHaveLength(1);
  });

  describe('guided tour', () => {
    const postgresMetrics: SaasPlatformMetrics = {
      ...metrics,
      series: [
        {
          metric_type: MetricType.PostgresUsedSize,
          points: [{ timestamp: '2026-09-22T12:00:00.000Z', value: 1_000 }],
        },
      ],
    };

    const renderMetrics = ({
      showGuidedTour,
      isLoading = false,
      platformMetrics = metrics,
      platformSla = null,
    }: {
      showGuidedTour: boolean;
      isLoading?: boolean;
      platformMetrics?: SaasPlatformMetrics;
      platformSla?: SaasPlatformSla | null;
    }) =>
      testRender(
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={platformMetrics}
          sla={platformSla}
          isLoading={isLoading}
          period={SaasPlatformMetricsPeriod.Last_90Days}
          onPeriodChange={vi.fn()}
          showGuidedTour={showGuidedTour}
        />
      );

    afterEach(() => {
      vi.mocked(useTranslations).mockImplementation(() => mockTranslations());
    });

    const goToStep = async (
      user: ReturnType<typeof testRender>['user'],
      step: number
    ) => {
      await user.click(screen.getByRole('button', { name: 'Tour.GuidedTour' }));
      for (let index = 1; index < step; index++) {
        await user.click(
          await screen.findByRole('button', { name: 'Tour.NextStep' })
        );
      }
    };

    it('should hide the tour from a user who is not an admin', () => {
      // Given / When
      renderMetrics({ showGuidedTour: false });

      // Then
      expect(
        screen.queryByRole('button', { name: 'Tour.GuidedTour' })
      ).not.toBeInTheDocument();
    });

    it('should hide the tour while the metrics load', () => {
      // Given / When
      renderMetrics({ showGuidedTour: true, isLoading: true });

      // Then
      expect(
        screen.queryByRole('button', { name: 'Tour.GuidedTour' })
      ).not.toBeInTheDocument();
    });

    it('should explain where the metrics come from on the first step', async () => {
      // Given the metrics shown to an admin
      const { user } = renderMetrics({ showGuidedTour: true });

      // When the admin starts the tour
      await user.click(screen.getByRole('button', { name: 'Tour.GuidedTour' }));

      // Then
      expect(
        await screen.findByText('Register.Metrics.Tour.Source')
      ).toBeVisible();
    });

    it.each`
      step | content
      ${3} | ${'Register.Metrics.Tour.FileStorage'}
      ${4} | ${'Register.Metrics.Tour.ChartAxes'}
    `(
      'should show $content on step $step',
      async ({ step, content }: { step: number; content: string }) => {
        // Given the metrics of a platform, shown to an admin
        const { user } = renderMetrics({ showGuidedTour: true });

        // When the admin goes to the step
        await goToStep(user, step);

        // Then
        expect(await screen.findByText(content)).toBeVisible();
      }
    );

    it('should explain the colors of the SLA chart against the contractual rate on the last step', async () => {
      // Given the metrics of a platform with an SLA, shown to an admin
      vi.mocked(useTranslations).mockReturnValue(
        mockTranslations({ translate: translateWithValues })
      );
      const { user } = renderMetrics({
        showGuidedTour: true,
        platformSla: sla,
      });

      // When the admin goes to the fifth step
      await goToStep(user, 5);

      // Then the step gives the target of the contract
      expect(
        await screen.findByText(
          translateWithValues('Register.Metrics.Tour.Sla', {
            target: '99.98%',
          })
        )
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Tour.NextStep' })
      ).toBeDisabled();
    });

    it('should point at the charts of the metrics loaded after the page opened', async () => {
      // Given the metrics of a platform with PostgreSQL and an SLA, loaded after the page opened
      vi.mocked(useTranslations).mockReturnValue(
        mockTranslations({ translate: translateWithValues })
      );
      const renderLoadedMetrics = (isLoading: boolean) => (
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Openaev}
          metrics={isLoading ? undefined : postgresMetrics}
          sla={isLoading ? undefined : sla}
          isLoading={isLoading}
          period={SaasPlatformMetricsPeriod.Last_90Days}
          onPeriodChange={vi.fn()}
          showGuidedTour
        />
      );
      const { user, rerender } = testRender(renderLoadedMetrics(true));
      rerender(renderLoadedMetrics(false));

      // When the admin starts the tour
      await user.click(screen.getByRole('button', { name: 'Tour.GuidedTour' }));

      // Then the tour names the database of the loaded metrics and ends on their SLA chart
      expect(
        screen.getAllByRole('button', { name: /Tour\.GoToStep/ })
      ).toHaveLength(5);
      await user.click(screen.getByRole('button', { name: 'Tour.NextStep' }));
      expect(
        await screen.findByText(
          translateWithValues('Register.Metrics.Tour.Database', {
            database: 'PostgreSQL',
          })
        )
      ).toBeVisible();
    });

    it('should end the tour on the storage charts when the platform has no SLA', async () => {
      // Given the metrics of a platform without SLA, shown to an admin
      const { user } = renderMetrics({ showGuidedTour: true });

      // When the admin goes to the fourth step
      await goToStep(user, 4);

      // Then it is the last one
      expect(
        await screen.findByText('Register.Metrics.Tour.ChartAxes')
      ).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Tour.NextStep' })
      ).toBeDisabled();
    });

    it('should keep the tour open on the period step while the chosen period loads', async () => {
      // Given the tour opened on the step about the period selector
      const renderPeriod = (
        period: SaasPlatformMetricsPeriod,
        isRefreshing: boolean
      ) => (
        <PlatformMetrics
          platformIdentifier={PlatformIdentifier.Opencti}
          metrics={metrics}
          storage={storage}
          isLoading={false}
          isRefreshing={isRefreshing}
          period={period}
          onPeriodChange={vi.fn()}
          showGuidedTour
        />
      );
      const { user, rerender } = testRender(
        renderPeriod(SaasPlatformMetricsPeriod.Last_90Days, false)
      );
      await goToStep(user, 4);

      // When the admin chooses another period, which loads then shows
      rerender(renderPeriod(SaasPlatformMetricsPeriod.Last_30Days, true));
      rerender(renderPeriod(SaasPlatformMetricsPeriod.Last_30Days, false));

      // Then the tour stays on the same step
      expect(
        await screen.findByText('Register.Metrics.Tour.ChartAxes')
      ).toBeVisible();
    });

    it.each`
      engine             | platformMetrics
      ${'Elasticsearch'} | ${metrics}
      ${'PostgreSQL'}    | ${postgresMetrics}
    `(
      'should name $engine on the step about the database chart',
      async ({
        engine,
        platformMetrics,
      }: {
        engine: string;
        platformMetrics: SaasPlatformMetrics;
      }) => {
        // Given the tour opened on the metrics of a platform
        vi.mocked(useTranslations).mockReturnValue(
          mockTranslations({ translate: translateWithValues })
        );
        const { user } = renderMetrics({
          showGuidedTour: true,
          platformMetrics,
        });
        await user.click(
          screen.getByRole('button', { name: 'Tour.GuidedTour' })
        );

        // When the admin goes to the next step
        await user.click(
          await screen.findByRole('button', { name: 'Tour.NextStep' })
        );

        // Then the step names the database the chart measures
        expect(
          await screen.findByText(
            translateWithValues('Register.Metrics.Tour.Database', {
              database: engine,
            })
          )
        ).toBeVisible();
      }
    );
  });
});
