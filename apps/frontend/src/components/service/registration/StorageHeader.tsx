'use client';

import {
  hasStorageUsage,
  StorageUsageStatus,
} from '@/components/service/registration/storage-usage-chart.utils';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { SaasPlatformStorageUsage } from '@graphql/generated';
import { useFormatter } from 'next-intl';

interface StorageHeaderProps {
  storage?: SaasPlatformStorageUsage | null;
  usageStatus: StorageUsageStatus | null;
  formatSize: (bytes: number) => string;
}

export const StorageHeader = ({
  storage,
  usageStatus,
  formatSize,
}: StorageHeaderProps) => {
  const t = useTranslate();
  const format = useFormatter();

  if (!hasStorageUsage(storage)) {
    return <p className="text-sm">{t('Register.Metrics.Unavailable')}</p>;
  }

  return (
    <div className="flex flex-row items-center gap-3">
      {t.rich('Register.Metrics.UsedOfLimit', {
        used: formatSize(storage.used),
        limit: formatSize(storage.limit),
        highlight: (chunks) => (
          <span className="text-lg content-highlight">{chunks}</span>
        ),
        secondary: (chunks) => (
          <span className="text-default-secondary">{chunks}</span>
        ),
      })}
      {usageStatus && (
        <div className={cn('content-highlight', usageStatus.colorClass)}>
          {format.number(storage.percent / 100, {
            style: 'percent',
            maximumFractionDigits: 1,
          })}
        </div>
      )}
    </div>
  );
};
