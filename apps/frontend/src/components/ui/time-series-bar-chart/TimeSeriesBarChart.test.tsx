import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import type { ApexOptions } from 'apexcharts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeSeriesBarChart } from './TimeSeriesBarChart';
import type { TimeSeriesPoint } from './time-series-bar-chart.utils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// jsdom has no SVG layout for ApexCharts to measure: capture what the chart is given instead.
const mocks = vi.hoisted(() => ({ chart: vi.fn() }));

vi.mock('react-apexcharts', () => ({
  default: (props: unknown) => {
    mocks.chart(props);
    return <div data-testid="time-series-bar-chart" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SERIES_NAME = 'Storage used';

const formatValue = (value: number) => `${value} units`;

const points: TimeSeriesPoint[] = [
  { timestamp: '2026-09-22T09:00:00.000Z', value: 1_000_000_000 },
  { timestamp: '2026-09-22T10:00:00.000Z', value: null },
  { timestamp: '2026-09-22T11:00:00.000Z', value: 1_500_000_000 },
];

const renderChart = async (
  props: Partial<Parameters<typeof TimeSeriesBarChart>[0]> = {}
) => {
  testRender(
    <TimeSeriesBarChart
      seriesName={SERIES_NAME}
      points={points}
      formatValue={formatValue}
      {...props}
    />
  );
  await screen.findByTestId('time-series-bar-chart');
  return mocks.chart.mock.lastCall?.[0] as {
    type: string;
    height: number;
    series: unknown;
    options: ApexOptions;
  };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TimeSeriesBarChart', () => {
  beforeEach(() => {
    mocks.chart.mockClear();
  });

  it('should display a bar chart of the points named after the series', async () => {
    // Given / When
    const chart = await renderChart();

    // Then
    expect(chart.type).toBe('bar');
    expect(chart.series).toEqual([
      {
        name: SERIES_NAME,
        data: [
          [Date.parse('2026-09-22T09:00:00.000Z'), 1_000_000_000],
          [Date.parse('2026-09-22T10:00:00.000Z'), null],
          [Date.parse('2026-09-22T11:00:00.000Z'), 1_500_000_000],
        ],
      },
    ]);
  });

  it.each`
    case                     | color                                      | expected
    ${'by default'}          | ${undefined}                               | ${'var(--color-filigran-brand-primary)'}
    ${'when given a colour'} | ${'var(--color-filigran-brand-secondary)'} | ${'var(--color-filigran-brand-secondary)'}
  `('should paint the bars $case', async ({ color, expected }) => {
    // Given / When
    const { options } = await renderChart({ color });

    // Then
    expect(options.colors).toEqual([expected]);
  });

  it.each`
    case                     | height       | expected
    ${'by default'}          | ${undefined} | ${240}
    ${'when given a height'} | ${320}       | ${320}
  `('should be $expected pixels high $case', async ({ height, expected }) => {
    // Given / When
    const chart = await renderChart({ height });

    // Then
    expect(chart.height).toBe(expected);
  });

  it('should format the values on the y axis and in the tooltip with the given formatter', async () => {
    // Given / When
    const { options } = await renderChart();

    // Then
    const yaxis = options.yaxis as ApexYAxis;
    const tooltipY = options.tooltip?.y as ApexTooltipY;
    expect(yaxis.labels?.formatter?.(1_500)).toBe('1500 units');
    expect(tooltipY.formatter?.(1_500)).toBe('1500 units');
  });

  it('should draw a dashed peak line labelled with the formatted highest value', async () => {
    // Given / When
    const { options } = await renderChart();

    // Then
    expect(options.annotations?.yaxis).toEqual([
      expect.objectContaining({
        y: 1_500_000_000,
        strokeDashArray: expect.any(Number),
        label: expect.objectContaining({
          text: 'TimeSeriesBarChart.Peak - 1500000000 units',
        }),
      }),
    ]);
  });

  it('should draw a thick solid red limit line labelled with a critical chip on the left, under the peak line', async () => {
    // Given / When
    const { options } = await renderChart({
      limit: { value: 2_000_000_000, label: 'Max capacity' },
    });

    // Then
    expect(options.annotations?.yaxis).toEqual([
      expect.objectContaining({
        y: 2_000_000_000,
        borderColor: 'var(--color-feedback-error-primary)',
        borderWidth: 2,
        strokeDashArray: 0,
        label: expect.objectContaining({
          text: 'Max capacity - 2000000000 units',
          position: 'left',
          borderRadius: 4,
          style: expect.objectContaining({
            background: 'var(--color-feedback-error-secondary)',
            color: 'var(--text-default-primary)',
            fontSize: '14px',
            padding: { left: 8, right: 8, top: 2, bottom: 2 },
          }),
        }),
      }),
      expect.objectContaining({
        y: 1_500_000_000,
        strokeDashArray: expect.any(Number),
        label: expect.objectContaining({
          text: 'TimeSeriesBarChart.Peak - 1500000000 units',
          position: 'left',
        }),
      }),
    ]);
  });

  it.each`
    case                             | limitValue       | limitLabelOffsetY | peakLabelOffsetY
    ${'the peak is below the limit'} | ${2_000_000_000} | ${0}              | ${16}
    ${'the peak reaches the limit'}  | ${1_500_000_000} | ${21}             | ${0}
    ${'the peak is above the limit'} | ${1_000_000_000} | ${21}             | ${0}
  `(
    'should put the label of the lower line below it when $case',
    async ({ limitValue, limitLabelOffsetY, peakLabelOffsetY }) => {
      // Given / When
      const { options } = await renderChart({
        limit: { value: limitValue, label: 'Max capacity' },
      });

      // Then
      const [limitLine, peakLine] = options.annotations?.yaxis ?? [];
      expect(limitLine.label?.offsetY).toBe(limitLabelOffsetY);
      expect(peakLine.label?.offsetY).toBe(peakLabelOffsetY);
    }
  );

  it.each`
    case                 | limit                                              | expected
    ${'without a limit'} | ${undefined}                                       | ${1}
    ${'with a limit'}    | ${{ value: 2_000_000_000, label: 'Max capacity' }} | ${0.8}
  `(
    'should fill the bars at $expected opacity $case',
    async ({ limit, expected }) => {
      // Given / When
      const { options } = await renderChart({ limit });

      // Then
      expect(options.fill?.opacity).toBe(expected);
    }
  );

  it('should keep the limit label above its line when there is no peak line', async () => {
    // Given / When
    const { options } = await renderChart({
      points: [],
      limit: { value: 2_000_000_000, label: 'Max capacity' },
    });

    // Then
    expect(options.annotations?.yaxis).toEqual([
      expect.objectContaining({
        y: 2_000_000_000,
        label: expect.objectContaining({ offsetY: 0 }),
      }),
    ]);
  });

  it.each`
    case                                    | computedMax      | expected
    ${'the highest bar is below the limit'} | ${1_500_000_000} | ${2_000_000_000}
    ${'the highest bar is above the limit'} | ${2_500_000_000} | ${2_500_000_000}
  `(
    'should end the y axis at $expected when $case',
    async ({ computedMax, expected }) => {
      // Given / When
      const { options } = await renderChart({
        limit: { value: 2_000_000_000, label: 'Max capacity' },
      });

      // Then
      const max = (options.yaxis as ApexYAxis).max as (max: number) => number;
      expect(max(computedMax)).toBe(expected);
    }
  );

  it('should neither draw a limit line nor bound the y axis without a limit', async () => {
    // Given / When
    const { options } = await renderChart();

    // Then
    expect(options.annotations?.yaxis).toHaveLength(1);
    expect(options.yaxis).not.toHaveProperty('max');
  });

  it.each([
    ['there are no points', []],
    [
      'no point has a value',
      [{ timestamp: '2026-09-22T09:00:00.000Z', value: null }],
    ],
  ])('should not draw a peak line when %s', async (_, pointsWithoutValue) => {
    // Given / When
    const { options } = await renderChart({
      points: pointsWithoutValue,
    });

    // Then
    expect(options.annotations?.yaxis).toEqual([]);
  });
});
