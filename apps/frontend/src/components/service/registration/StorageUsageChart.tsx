'use client';

import { splitByteSize } from '@/components/service/registration/storage-usage-chart.utils';
import { TimeSeriesBarChart } from '@/components/ui/time-series-bar-chart';
import { useTranslate } from '@/hooks/use-translate';
import { SaasPlatformMetricPoint } from '@graphql/generated';
import { useFormatter } from 'next-intl';
import { useCallback } from 'react';

interface StorageUsageChartProps {
  points: SaasPlatformMetricPoint[];
  graphType: 'Database' | 'FileStorage';
  color: string;
}

export const StorageUsageChart = ({
  points,
  graphType,
  color,
}: StorageUsageChartProps) => {
  const t = useTranslate();
  const title = t(`Register.Metrics.${graphType}.Title`);

  const format = useFormatter();
  const formatSize = useCallback(
    (bytes: number) => {
      const { value, unit } = splitByteSize(bytes);
      return format.number(value, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
        maximumFractionDigits: 1,
      });
    },
    [format]
  );

  return (
    <figure>
      <figcaption className="flex items-baseline">
        <div className="flex flex-col">
          <h3 className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-xs"
              style={{ backgroundColor: color }}
            />
            {title}
          </h3>
          <p className="text-default-secondary">
            {t(`Register.Metrics.${graphType}.Subtitle`)}
          </p>
        </div>
      </figcaption>
      {points.some(({ value }) => typeof value === 'number') ? (
        <TimeSeriesBarChart
          seriesName={title}
          points={points}
          formatValue={formatSize}
          color={color}
        />
      ) : (
        <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>
      )}
    </figure>
  );
};
