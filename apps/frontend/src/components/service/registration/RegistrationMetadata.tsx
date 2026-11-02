'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { computePeriodProgress, useDateFormatter } from '@/utils/date';
import {
  Icon,
  IconButton,
  ProgressBar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { SaasPlatformMetadata } from '@graphql/generated';
import { useId } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';

interface RegistrationMetadataProps {
  metadata?: SaasPlatformMetadata | null;
  isLoading: boolean;
}

export const RegistrationMetadata = ({
  metadata,
  isLoading,
}: RegistrationMetadataProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const contractLabelId = useId();
  const daysLeftId = useId();
  const [, copy] = useCopyToClipboard();

  const hostname = metadata?.hostname;

  if (isLoading) {
    return <RegistrationMetadataSkeleton />;
  }

  const copyHostname = async (hostname: string) => {
    const copied = await copy(hostname);
    showSnackbar(
      copied
        ? { severity: 'success', title: t('Utils.Copied') }
        : { severity: 'error', title: t('Utils.FailedToCopy') }
    );
  };

  const contractPeriod =
    metadata?.start_date && metadata?.end_date
      ? computePeriodProgress(metadata?.start_date, metadata?.end_date)
      : null;

  return (
    <section className="flex justify-between p-6">
      <ul className="text-sm flex flex-col gap-4">
        <li className="flex items-center">
          <span>
            <span className="mr-1 text-default-secondary">
              {t('Register.Metrics.Metadata.Hostname')}:
            </span>
            {hostname ? (
              <span className="font-mono text-filigran-brand-primary">
                {hostname}
              </span>
            ) : (
              t('Register.Metrics.Metadata.Unavailable')
            )}
          </span>
          {hostname && (
            <TooltipProvider>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <IconButton
                    priority="tertiary"
                    size="sm"
                    className="ml-1"
                    aria-label={t('Register.Metrics.Metadata.CopyHostname')}
                    icon={
                      <Icon
                        name="files"
                        size={16}
                      />
                    }
                    onClick={() => copyHostname(hostname)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {t('Register.Metrics.Metadata.CopyHostname')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </li>
        <li>
          <span className="mr-1 text-default-secondary">
            {t('Register.Metrics.Metadata.SubscribedPlan')}:
          </span>
          {metadata?.plan ?? t('Register.Metrics.Metadata.Unavailable')}
        </li>
        <li className="flex flex-col gap-2">
          <span>
            <span
              id={contractLabelId}
              className="mr-1 text-default-secondary">
              {t('Register.Metrics.Metadata.Contract')}:
            </span>
            {contractPeriod
              ? `${formatDate(metadata?.start_date, 'DATE_MEDIUM')} → ${formatDate(metadata?.end_date, 'DATE_MEDIUM')}`
              : t('Register.Metrics.Metadata.Unavailable')}
          </span>
          {contractPeriod && (
            <div className="flex items-center gap-2">
              <ProgressBar
                value={contractPeriod.elapsedPercent}
                aria-labelledby={`${contractLabelId} ${daysLeftId}`}
                className="flex-1"
              />
              <span
                id={daysLeftId}
                className="shrink-0">
                {t('Register.Metrics.Metadata.DaysLeft', {
                  days: contractPeriod.daysLeft,
                })}
              </span>
            </div>
          )}
        </li>
        <li>
          <span className="mr-1 text-default-secondary">
            {t('Register.Metrics.Metadata.RegionalArea')}:
          </span>
          {metadata?.region ?? t('Register.Metrics.Metadata.Unavailable')}
        </li>
      </ul>
    </section>
  );
};

const RegistrationMetadataSkeleton = () => {
  const t = useTranslate();

  return (
    <section
      aria-busy="true"
      className="flex justify-between p-6">
      <ul className="text-sm flex flex-col gap-4">
        {[
          'Register.Metrics.Metadata.Hostname',
          'Register.Metrics.Metadata.SubscribedPlan',
          'Register.Metrics.Metadata.Contract',
          'Register.Metrics.Metadata.RegionalArea',
        ].map((labelKey) => (
          <li
            key={labelKey}
            className="flex items-center">
            <span className="mr-1 text-default-secondary">{t(labelKey)}:</span>
            <Skeleton className="h-4 w-40" />
          </li>
        ))}
      </ul>
    </section>
  );
};
