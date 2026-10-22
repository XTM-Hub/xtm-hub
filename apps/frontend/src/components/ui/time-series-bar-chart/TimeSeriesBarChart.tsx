'use client';

import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { useDateFormatter } from '@/utils/date';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import {
  findPeakValue,
  type TimeSeriesPoint,
  toChartData,
} from './time-series-bar-chart.utils';

// ApexCharts reaches for window as soon as it loads: keep it out of the server render.
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const DEFAULT_HEIGHT = 240;
const DEFAULT_COLOR = 'var(--color-filigran-brand-primary)';
const PEAK_LINE_DASH_PX = 4;
const PEAK_LABEL_OFFSET_X_PX = 4;

// Dresses the ApexCharts toolbar as tertiary sm IconButtons and its export menu as a Menu. ApexCharts injects
// an unlayered stylesheet, which beats any Tailwind layer: every rule here needs the important modifier.
const TOOLBAR_CLASS_NAME = cn(
  '[&_.apexcharts-toolbar]:gap-1! [&_.apexcharts-toolbar]:rounded-none! [&_.apexcharts-toolbar]:bg-transparent! [&_.apexcharts-toolbar]:p-0! [&_.apexcharts-toolbar]:backdrop-filter-none!',
  '[&_.apexcharts-toolbar>button]:text-icon-highlight! [&_.apexcharts-toolbar>button]:size-6! [&_.apexcharts-toolbar>button]:rounded-sm! [&_.apexcharts-toolbar_svg]:size-4!',
  '[&_.apexcharts-selected]:bg-filigran-brand-primary-transparency-10! [&_.apexcharts-toolbar>button:hover]:bg-filigran-brand-primary-transparency-10! [&_.apexcharts-toolbar>button:hover]:text-icon-highlight!',
  '[&_.apexcharts-toolbar>button:focus-visible]:outline-filigran-brand-primary! [&_.apexcharts-toolbar>button:focus-visible]:outline-offset-2!',
  '[&_.apexcharts-menu]:bg-elevation-highlight! [&_.apexcharts-menu]:shadow-global-shadow! [&_.apexcharts-menu]:text-default-primary! [&_.apexcharts-menu]:min-w-0! [&_.apexcharts-menu]:rounded-sm! [&_.apexcharts-menu]:border-0! [&_.apexcharts-menu]:px-0! [&_.apexcharts-menu]:py-1! [&_.apexcharts-menu]:backdrop-filter-none!',
  '[&_.apexcharts-menu-item]:font-content-base! [&_.apexcharts-menu-item]:text-content-base! [&_.apexcharts-menu-item]:leading-content-base! [&_.apexcharts-menu-item]:flex! [&_.apexcharts-menu-item]:min-h-9! [&_.apexcharts-menu-item]:items-center! [&_.apexcharts-menu-item]:rounded-none! [&_.apexcharts-menu-item]:px-4! [&_.apexcharts-menu-item]:py-1! [&_.apexcharts-menu-item]:whitespace-nowrap!',
  '[&_.apexcharts-menu-item:focus-visible]:bg-input-hover! [&_.apexcharts-menu-item:focus-visible]:outline-filigran-brand-primary! [&_.apexcharts-menu-item:hover]:bg-input-hover!'
);

export interface TimeSeriesBarChartProps {
  seriesName: string;
  points: TimeSeriesPoint[];
  // Formats a value on the y axis, in the tooltip and in the peak label: keep it stable (useCallback).
  formatValue: (value: number) => string;
  color?: string;
  height?: number;
}

export const TimeSeriesBarChart = ({
  seriesName,
  points,
  formatValue,
  color = DEFAULT_COLOR,
  height = DEFAULT_HEIGHT,
}: TimeSeriesBarChartProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const { resolvedTheme } = useTheme();

  const peakValue = useMemo(() => findPeakValue(points), [points]);
  const series = useMemo(
    () => [{ name: seriesName, data: toChartData(points) }],
    [points, seriesName]
  );

  const peakLabel = t('TimeSeriesBarChart.Peak');

  const options = useMemo<ApexOptions>(() => {
    const themeMode = resolvedTheme === 'light' ? 'light' : 'dark';
    // A reference line, not data: it wears the secondary ink so it never reads as another series.
    const peakAnnotations =
      peakValue === null
        ? []
        : [
            {
              y: peakValue,
              borderColor: 'var(--text-default-secondary)',
              strokeDashArray: PEAK_LINE_DASH_PX,
              label: {
                text: `${peakLabel} - ${formatValue(peakValue)}`,
                position: 'left',
                textAnchor: 'start',
                offsetX: PEAK_LABEL_OFFSET_X_PX,
                borderWidth: 0,
                style: {
                  background: 'transparent',
                  color: 'var(--text-default-secondary)',
                },
              },
            },
          ];
    return {
      annotations: { yaxis: peakAnnotations },
      chart: {
        type: 'bar',
        background: 'transparent',
        fontFamily: 'inherit',
        toolbar: { show: true },
        zoom: { enabled: true },
        animations: { enabled: true },
      },
      theme: { mode: themeMode },
      colors: [color],
      plotOptions: {
        bar: {
          columnWidth: '80%',
          borderRadius: 2,
          borderRadiusApplication: 'end',
        },
      },
      fill: { type: 'solid', opacity: 1 },
      dataLabels: { enabled: false },
      grid: {
        borderColor: 'var(--border-elevation-subtle)',
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        type: 'datetime',
        axisTicks: { show: false },
        tooltip: { enabled: false },
        labels: {
          style: { colors: 'var(--text-default-secondary)' },
          formatter: (_, timestamp) =>
            timestamp
              ? (formatDate(new Date(timestamp), 'DATE_MEDIUM') ?? '')
              : '',
        },
      },
      yaxis: {
        min: 0,
        labels: {
          style: { colors: 'var(--text-default-secondary)' },
          formatter: formatValue,
        },
      },
      tooltip: { y: { formatter: formatValue } },
    };
  }, [resolvedTheme, formatDate, formatValue, peakValue, peakLabel, color]);

  return (
    <div className={TOOLBAR_CLASS_NAME}>
      <Chart
        type="bar"
        height={height}
        series={series}
        options={options}
      />
    </div>
  );
};
