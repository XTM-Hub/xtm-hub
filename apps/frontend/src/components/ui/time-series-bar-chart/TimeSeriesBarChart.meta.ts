import type { ComponentMeta } from '@filigran/design-system/meta';

export const TimeSeriesBarChartMeta: ComponentMeta = {
  name: 'TimeSeriesBarChart',
  description:
    'Bar chart of one series of timestamped values, drawn with ApexCharts and loaded client-side only. It knows no unit: the caller formats the values through formatValue, used on the y axis, in the tooltip and in the peak label. Bars take the color prop (var(--color-filigran-brand-primary) by default) with 2px rounded tops, axes and grid wear the secondary text and subtle border tokens, and the chart follows the light or dark theme. Its ApexCharts toolbar (zoom, pan, reset, export menu) wears the design system through Tailwind classes on its wrapper: tertiary sm IconButtons 4px apart, and a Menu for the exports. It draws the plot only: the caller owns the title. A dashed peak line in secondary ink, labelled "Peak - <formatted value>" (TimeSeriesBarChart.Peak), marks the highest value.',
  status: 'beta',
  category: 'data-display',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default'],
  sizes: [],
  examples: [
    '<TimeSeriesBarChart seriesName="Storage used" points={points} formatValue={formatSize} />',
    '<TimeSeriesBarChart seriesName="Storage used" points={points} formatValue={formatSize} color="var(--color-filigran-brand-secondary)" height={320} />',
  ],
  props: {
    seriesName: 'string (required) - names the series in the tooltip.',
    points:
      'TimeSeriesPoint[] (required) - { timestamp: ISO date string, value: number | null }; a null value is a gap.',
    formatValue:
      '(value: number) => string (required) - formats a value on the y axis, in the tooltip and in the peak label; keep it stable (useCallback).',
    color:
      'string (optional) - colour of the bars, any CSS colour or token variable, var(--color-filigran-brand-primary) by default.',
    height: 'number (optional) - chart height in pixels, 240 by default.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      'Renders the ApexCharts SVG only: wrap it in a <figure> with a <figcaption> title, as StorageUsageChart does, so the plot is named. It has no text alternative yet: a table view of the points is still missing for 1.1.1 Non-text Content.',
  },
};
