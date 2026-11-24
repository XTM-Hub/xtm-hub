export interface TimeSeriesPoint {
  timestamp: string;
  value?: number | null;
}

export const toChartData = (
  points: TimeSeriesPoint[]
): [number, number | null][] =>
  points.map(({ timestamp, value }) => [
    new Date(timestamp).getTime(),
    value ?? null,
  ]);

export const findPeakValue = (points: TimeSeriesPoint[]): number | null =>
  points.reduce<number | null>(
    (peak, { value }) =>
      typeof value === 'number' && (peak === null || value > peak)
        ? value
        : peak,
    null
  );

// Share of the highest drawn value left free above it: a reference line on the very top edge of the plot is
// hidden by ApexCharts as soon as its rounding puts it a hair outside, and its label needs room above it.
const Y_AXIS_HEADROOM_RATIO = 0.1;

export const yAxisMaxWithHeadroom = (
  highestBarValue: number,
  limitValue: number
): number =>
  Math.max(highestBarValue, limitValue) * (1 + Y_AXIS_HEADROOM_RATIO);
