import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import testRender from '@/utils/test/test-render';
import { SaasPlatformStorageUsage } from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ApexOptions } from 'apexcharts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// jsdom has no SVG layout for ApexCharts to measure: capture what the chart is given instead.
const mocks = vi.hoisted(() => ({ chart: vi.fn() }));

vi.mock('react-apexcharts', () => ({
  default: (props: unknown) => {
    mocks.chart(props);
    return <div data-testid="storage-usage-chart" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const points = [
  { timestamp: '2026-09-22T09:00:00.000Z', value: 1_000_000_000 },
  { timestamp: '2026-09-22T11:00:00.000Z', value: 1_500_000_000 },
];

const GRAPH_TYPE = 'FileStorage';
const COLOR = 'var(--color-filigran-brand-secondary)';
const storageUsage = (percent: number | null): SaasPlatformStorageUsage => ({
  percent,
  used: 1_500_000_000,
  limit: 3_000_000_000,
  time: '2026-10-23T13:46:23.624Z',
});

const renderStorageUsageChart = async (
  storage?: SaasPlatformStorageUsage | null
) => {
  testRender(
    <StorageUsageChart
      points={points}
      storage={storage}
      graphType={GRAPH_TYPE}
      color={COLOR}
    />
  );
  await screen.findByTestId('storage-usage-chart');
  return (mocks.chart.mock.lastCall?.[0] as { options: ApexOptions }).options;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageUsageChart', () => {
  beforeEach(() => {
    mocks.chart.mockClear();
  });

  it('should display the title and subtitle of its graph type', async () => {
    // Given / When
    await renderStorageUsageChart();

    // Then
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Register.Metrics.FileStorage.Title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Register.Metrics.FileStorage.Subtitle')
    ).toBeInTheDocument();
  });

  it('should paint the square before the title and the bars with its colour', async () => {
    // Given / When
    const options = await renderStorageUsageChart();

    // Then
    const square = screen
      .getByRole('heading', { level: 3 })
      .querySelector('[aria-hidden="true"]');
    expect(square).toHaveStyle({ backgroundColor: COLOR });
    expect(options.colors).toEqual([COLOR]);
  });

  it.each`
    bytes                | expected
    ${0}                 | ${'0 byte'}
    ${999}               | ${'999 byte'}
    ${1_500}             | ${'1.5 kB'}
    ${12_340_000}        | ${'12.3 MB'}
    ${1_500_000_000}     | ${'1.5 GB'}
    ${4_000_000_000_000} | ${'4 TB'}
  `(
    'should show $bytes bytes as $expected on the y axis and in the tooltip',
    async ({ bytes, expected }) => {
      // Given / When
      const options = await renderStorageUsageChart();

      // Then
      const yaxis = options.yaxis as ApexYAxis;
      const tooltipY = options.tooltip?.y as ApexTooltipY;
      expect(yaxis.labels?.formatter?.(bytes)).toBe(expected);
      expect(tooltipY.formatter?.(bytes)).toBe(expected);
    }
  );

  it('should draw the peak line of the storage used', async () => {
    // Given / When
    const options = await renderStorageUsageChart();

    // Then
    expect(options.annotations?.yaxis).toEqual([
      expect.objectContaining({
        y: 1_500_000_000,
        label: expect.objectContaining({
          text: 'TimeSeriesBarChart.Peak - 1.5 GB',
        }),
      }),
    ]);
  });

  it.each`
    percent | level            | colorClass
    ${50}   | ${'Within'}      | ${'text-feedback-success-primary'}
    ${65}   | ${'Approaching'} | ${'text-feedback-warning-primary'}
    ${90}   | ${'Approaching'} | ${'text-feedback-error-primary'}
    ${100}  | ${'Over'}        | ${'text-feedback-error-primary'}
  `(
    'should show the $level capacity chip and colour the percentage when $percent% is used',
    async ({ percent, level, colorClass }) => {
      // Given / When
      await renderStorageUsageChart(storageUsage(percent));

      // Then
      expect(
        screen.getByText(`Register.Metrics.Capacity.${level}`)
      ).toBeInTheDocument();
      expect(screen.getByText(`${percent}%`)).toHaveClass(colorClass);
    }
  );

  it.each`
    case             | percent | expected
    ${'above 90%'}   | ${95}   | ${[expect.objectContaining({ y: 3_000_000_000, label: expect.objectContaining({ text: 'Register.Metrics.MaxCapacity - 3 GB' }) }), expect.objectContaining({ y: 1_500_000_000 })]}
    ${'exactly 90%'} | ${90}   | ${[expect.objectContaining({ y: 1_500_000_000 })]}
    ${'unknown'}     | ${null} | ${[expect.objectContaining({ y: 1_500_000_000 })]}
  `(
    'should draw the max capacity line only when the usage is $case',
    async ({ percent, expected }) => {
      // Given / When
      const options = await renderStorageUsageChart(storageUsage(percent));

      // Then
      expect(options.annotations?.yaxis).toEqual(expected);
    }
  );

  it('should show neither the capacity chip nor the usage when the limit is zero', async () => {
    // Given / When
    await renderStorageUsageChart({ ...storageUsage(0), used: 0, limit: 0 });

    // Then
    expect(
      screen.queryByText(/^Register\.Metrics\.Capacity\./)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Register.Metrics.Unavailable')
    ).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('should show neither the capacity chip nor the percentage when the percentage is unknown', async () => {
    // Given / When
    await renderStorageUsageChart(storageUsage(null));

    // Then
    expect(
      screen.queryByText(/^Register\.Metrics\.Capacity\./)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('should display the unavailable message only once when neither the usage nor the series is known', () => {
    // Given / When
    testRender(
      <StorageUsageChart
        points={[{ timestamp: '2026-09-22T09:00:00.000Z', value: null }]}
        storage={null}
        graphType={GRAPH_TYPE}
        color={COLOR}
      />
    );

    // Then
    expect(screen.getAllByText('Register.Metrics.Unavailable')).toHaveLength(1);
    expect(screen.queryByTestId('storage-usage-chart')).not.toBeInTheDocument();
  });

  it('should keep the usage above the unavailable message when only the series is missing', () => {
    // Given / When
    testRender(
      <StorageUsageChart
        points={[]}
        storage={storageUsage(50)}
        graphType={GRAPH_TYPE}
        color={COLOR}
      />
    );

    // Then
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getAllByText('Register.Metrics.Unavailable')).toHaveLength(1);
  });
});
