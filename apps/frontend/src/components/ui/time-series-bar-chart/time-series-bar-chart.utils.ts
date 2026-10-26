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
