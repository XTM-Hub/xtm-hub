import { PlatformMetrics } from '@/components/service/registration/PlatformMetrics';
import testRender from '@/utils/test/test-render';
import {
  MetricType,
  SaasPlatformMetrics,
  SaasPlatformResolution,
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
        isLoading={false}
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

  it('should display the metrics as loading while they are pending', () => {
    // Given / When
    const { container } = testRender(
      <PlatformMetrics
        metrics={undefined}
        isLoading
      />
    );

    // Then
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(
      screen.queryByText('Register.Metrics.Unavailable')
    ).not.toBeInTheDocument();
  });

  it.each([[null], [undefined]])(
    'should display the metrics as unavailable when they are %s',
    (unavailableMetrics) => {
      // Given / When
      const { container } = testRender(
        <PlatformMetrics
          metrics={unavailableMetrics}
          isLoading={false}
        />
      );

      // Then
      expect(
        screen.getByText('Register.Metrics.Unavailable')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[aria-busy="true"]')
      ).not.toBeInTheDocument();
    }
  );
});
