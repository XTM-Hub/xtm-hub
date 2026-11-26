import { StorageUsageChart } from '@/components/service/registration/StorageUsageChart';
import {
  mockTranslations,
  translateWithValues,
} from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { SaasPlatformStorageUsage } from '@graphql/generated';
import { screen } from '@testing-library/react';
import type { ApexOptions } from 'apexcharts';
import { useTranslations } from 'next-intl';
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

const GIB = 1_024 ** 3;
const points = [
  { timestamp: '2026-09-22T09:00:00.000Z', value: GIB },
  { timestamp: '2026-09-22T11:00:00.000Z', value: 1.5 * GIB },
];

const GRAPH_TYPE = 'FileStorage';
const COLOR = 'var(--color-filigran-brand-secondary)';
const storageUsage = (percent: number | null): SaasPlatformStorageUsage => ({
  percent,
  used: 1.5 * GIB,
  limit: 3 * GIB,
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

const translateSizes = () =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(mockTranslations({ translate: translateWithValues }));
const size = (value: string, unit: string) =>
  `Register.Metrics.ByteSize.${unit}:${JSON.stringify({ value })}`;

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
        level: 4,
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
      .getByRole('heading', { level: 4 })
      .querySelector('[aria-hidden="true"]');
    expect(square).toHaveStyle({ backgroundColor: COLOR });
    expect(options.colors).toEqual([COLOR]);
  });

  it.each`
    bytes                 | expected
    ${0}                  | ${size('0', 'Byte')}
    ${1_023}              | ${size('1,023', 'Byte')}
    ${1_536}              | ${size('1.5', 'Kibibyte')}
    ${12.34 * 1_024 ** 2} | ${size('12.3', 'Mebibyte')}
    ${1.5 * GIB}          | ${size('1.5', 'Gibibyte')}
    ${1_500_000_000}      | ${size('1.4', 'Gibibyte')}
    ${4 * 1_024 ** 4}     | ${size('4', 'Tebibyte')}
  `(
    'should show $bytes bytes as $expected on the y axis and in the tooltip',
    async ({ bytes, expected }) => {
      // Given
      translateSizes();

      // When
      const options = await renderStorageUsageChart();

      // Then
      const yaxis = options.yaxis as ApexYAxis;
      const tooltipY = options.tooltip?.y as ApexTooltipY;
      expect(yaxis.labels?.formatter?.(bytes)).toBe(expected);
      expect(tooltipY.formatter?.(bytes)).toBe(expected);
    }
  );

  it('should draw the peak line of the storage used', async () => {
    // Given
    translateSizes();

    // When
    const options = await renderStorageUsageChart();

    // Then
    expect(options.annotations?.yaxis).toEqual([
      expect.objectContaining({
        y: 1.5 * GIB,
        label: expect.objectContaining({
          text: `TimeSeriesBarChart.Peak - ${size('1.5', 'Gibibyte')}`,
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
    ${'above 90%'}   | ${95}   | ${[expect.objectContaining({ y: 3 * GIB, label: expect.objectContaining({ text: `Register.Metrics.MaxCapacity - ${size('3', 'Gibibyte')}` }) }), expect.objectContaining({ y: 1.5 * GIB })]}
    ${'exactly 90%'} | ${90}   | ${[expect.objectContaining({ y: 1.5 * GIB })]}
    ${'unknown'}     | ${null} | ${[expect.objectContaining({ y: 1.5 * GIB })]}
  `(
    'should draw the max capacity line only when the usage is $case',
    async ({ percent, expected }) => {
      // Given
      translateSizes();

      // When
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
