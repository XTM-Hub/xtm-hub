'use client';

import { StorageHeader } from '@/components/service/registration/StorageHeader';
import {
  hasStorageCapacity,
  hasStorageUsage,
  splitByteSize,
  storageLimitLineValue,
  storageUsageStatus,
} from '@/components/service/registration/storage-usage-chart.utils';
import { TimeSeriesBarChart } from '@/components/ui/time-series-bar-chart';
import { useTranslate } from '@/hooks/use-translate';
import { Chip } from '@filigran/design-system';
import {
  SaasPlatformMetricPoint,
  SaasPlatformStorageUsage,
} from '@graphql/generated';
import { useFormatter } from 'next-intl';
import { useCallback, useMemo } from 'react';

interface StorageUsageChartProps {
  points: SaasPlatformMetricPoint[];
  storage?: SaasPlatformStorageUsage | null;
  graphType: 'Database' | 'FileStorage';
  color: string;
}

export const StorageUsageChart = ({
  points,
  storage,
  graphType,
  color,
}: StorageUsageChartProps) => {
  const t = useTranslate();
  const title = t(`Register.Metrics.${graphType}.Title`);
  const usageStatus =
    hasStorageCapacity(storage) && typeof storage.percent === 'number'
      ? storageUsageStatus(storage.percent)
      : null;

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

  const limitLineValue = storageLimitLineValue(storage);
  const maxCapacityLabel = t('Register.Metrics.MaxCapacity');
  const limit = useMemo(
    () =>
      limitLineValue === null
        ? null
        : { value: limitLineValue, label: maxCapacityLabel },
    [limitLineValue, maxCapacityLabel]
  );

  const hasPoints = points.some(({ value }) => typeof value === 'number');
  // With neither the usage nor the series, the chart's unavailable message alone says it.
  const showHeader = hasPoints || hasStorageUsage(storage);

  return (
    <figure>
      <figcaption className="flex items-start justify-between gap-2">
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
        {usageStatus && (
          <Chip
            label={t(`Register.Metrics.Capacity.${usageStatus.level}`)}
            severity={usageStatus.severity}
          />
        )}
      </figcaption>
      {showHeader && (
        <StorageHeader
          storage={storage}
          usageStatus={usageStatus}
          formatSize={formatSize}
        />
      )}
      {hasPoints ? (
        <TimeSeriesBarChart
          seriesName={title}
          points={points}
          formatValue={formatSize}
          color={color}
          limit={limit}
        />
      ) : (
        <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>
      )}
    </figure>
  );
};
