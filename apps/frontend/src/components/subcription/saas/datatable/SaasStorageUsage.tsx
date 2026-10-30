import { STORAGE_PERCENT_FORMAT } from '@/components/subcription/saas/saas-list.utils';
import { cn } from '@/lib/utils';
import { ProgressBar } from '@filigran/design-system';
import { useFormatter } from 'next-intl';

export const SaasStorageUsage = ({
  percent,
  label,
  isHigh,
}: {
  percent: number | null | undefined;
  label: string;
  isHigh: boolean;
}) => {
  const format = useFormatter();

  if (typeof percent !== 'number') {
    return null;
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ProgressBar
        value={percent}
        aria-label={label}
        className={cn(
          'w-8 shrink-0',
          // The design system has no alert tone for a progress bar: its indicator is painted directly
          isHigh &&
            '[&>[data-slot=progress-bar-indicator]]:bg-feedback-alert-primary'
        )}
      />
      <span className={cn(isHigh && 'text-feedback-alert-primary')}>
        {format.number(percent / 100, STORAGE_PERCENT_FORMAT)}
      </span>
    </span>
  );
};
