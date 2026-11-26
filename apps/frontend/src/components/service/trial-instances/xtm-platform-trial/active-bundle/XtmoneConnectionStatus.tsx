'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { XtmoneStatusState } from '@/components/service/trial-instances/xtm-platform-trial/active-bundle/useXtmoneIntegrationStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslate } from '@/hooks/use-translate';
import { CheckCircleIcon, CircleCloseIcon } from '@filigran/icon';
import {
  PlatformIdentifier,
  XtmoneIntegrationStatusEntryFragment,
} from '@graphql/generated';

interface XtmoneConnectionStatusProps {
  status: XtmoneStatusState;
}

const StatusIcon = ({
  entry,
  isLoading,
  unavailable,
}: {
  entry?: XtmoneIntegrationStatusEntryFragment;
  isLoading: boolean;
  unavailable: boolean;
}) => {
  const t = useTranslate();

  if (isLoading) {
    return <Skeleton className="size-4 rounded-full" />;
  }

  if (unavailable || !entry) {
    return (
      <span className="text-content-compact text-default-secondary">
        {t('XtmPlatformTrial.Products.StatusUnavailable')}
      </span>
    );
  }

  return entry.connected ? (
    <CheckCircleIcon
      className="size-4 text-feedback-success-primary"
      aria-label={t('XtmPlatformTrial.Products.StatusActive')}
    />
  ) : (
    <CircleCloseIcon
      className="size-4 text-feedback-error-primary"
      aria-label={t('XtmPlatformTrial.Products.StatusNotConnected')}
    />
  );
};

const StatusRow = ({
  label,
  entry,
  isLoading,
  unavailable,
}: {
  label: string;
  entry?: XtmoneIntegrationStatusEntryFragment;
  isLoading: boolean;
  unavailable: boolean;
}) => (
  <div className="flex items-center justify-between gap-2 px-2 py-4">
    <span className="text-content-base text-default-secondary shrink-0 whitespace-nowrap">
      {label}
    </span>
    <StatusIcon
      entry={entry}
      isLoading={isLoading}
      unavailable={unavailable}
    />
  </div>
);

export const XtmoneConnectionStatus = ({
  status,
}: XtmoneConnectionStatusProps) => {
  const t = useTranslate();
  const { data, isLoading, isError, hasUrl } = status;
  const unavailable = !hasUrl || isError || !data;

  return (
    <div
      aria-busy={isLoading}
      className="flex flex-col divide-y divide-[var(--border-elevation-subtle)] overflow-hidden rounded border border-elevation-subtle">
      <StatusRow
        label={`${t('XtmPlatformTrial.Products.Connection', {
          productName: PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
        })}:`}
        entry={data?.opencti}
        isLoading={isLoading}
        unavailable={unavailable}
      />
      <StatusRow
        label={`${t('XtmPlatformTrial.Products.Connection', {
          productName: PlatformMetadataMapping[PlatformIdentifier.Openaev].name,
        })}:`}
        entry={data?.openaev}
        isLoading={isLoading}
        unavailable={unavailable}
      />
    </div>
  );
};
