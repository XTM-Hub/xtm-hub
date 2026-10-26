import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import testRender from '@/utils/test/test-render';
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

const renderStorageUsageChart = async () => {
  testRender(
    <StorageUsageChart
      points={points}
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
});
