import { PlatformMetrics } from '@/components/service/registration/PlatformMetrics';
import testRender from '@/utils/test/test-render';
import {
  MetricType,
  SaasPlatformMetrics,
  SaasPlatformMetricsPeriod,
  SaasPlatformResolution,
  SaasPlatformSla,
  SaasPlatformStorage,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('should display the storage of each card when only the metrics series are unavailable', () => {
    // Given / When
    testRender(
      <PlatformMetrics
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
});
