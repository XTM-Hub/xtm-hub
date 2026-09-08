'use client';

import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { XtmoneStatusState } from '@/components/xtm-platform-trial/useXtmoneIntegrationStatus';
import { CheckCircleIcon, CircleCloseIcon } from '@filigran/icon';
import { Skeleton } from '@filigran/ui';
import {
  PlatformIdentifier,
  XtmoneIntegrationStatusEntryFragment,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();

  if (isLoading) {
    return <Skeleton className="size-4 rounded-full" />;
  }

  if (unavailable || !entry) {
    return (
      <span className="text-content-body-compact text-text-default-secondary">
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
  <div className="flex items-center justify-between gap-s px-s py-l">
    <span className="text-content-body-base text-text-default-secondary shrink-0 whitespace-nowrap">
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
  const t = useTranslations();
  const { data, isLoading, isError, hasUrl } = status;
  const unavailable = !hasUrl || isError || !data;

  return (
    <div className="flex flex-col divide-y divide-elevation-border-subtle-layer-1 overflow-hidden rounded-lg border border-elevation-border-subtle-layer-1">
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
