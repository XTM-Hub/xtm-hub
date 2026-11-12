'use client';

import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { BundleCancelSheet } from '@/components/service/trial-instances/xtm-platform-trial/shared/BundleCancelSheet';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { daysUntil, useDateFormatter } from '@/utils/date';
import { xtmPlatformTrialManageUsersPath } from '@/utils/path/constant';
import { Button, Card, CardContent, Chip } from '@filigran/design-system';
import {
  PlatformContract,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import Link from 'next/link';
import { useState } from 'react';

interface BundleInfoCardProps {
  bundle: XtmPlatformBundleDetailsFragment;
  canManage: boolean;
}

const InfoRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 py-4">
    <span className="text-content-base text-default-secondary">{label}:</span>
    <span className="text-content-compact truncate">{children}</span>
  </div>
);

export const BundleInfoCard = ({ bundle, canManage }: BundleInfoCardProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const [openCancel, setOpenCancel] = useState(false);

  const remainingDays = bundle.end_date
    ? Math.max(daysUntil(new Date(bundle.end_date)), 0)
    : null;

  return (
    <Card
      elevation={2}
      padding={16}
      className="h-full">
      <CardContent
        clamp={0}
        className="flex flex-col gap-3 h-full">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate">
            {t('XtmPlatformTrial.BundleInfo.Title')}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-[var(--border-elevation-subtle)]">
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.OrganizationName')}>
            {bundle.organization_name ?? '-'}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.StartedOn')}>
            {formatDate(bundle.start_date ?? undefined, 'DATE_FULL') ?? '-'}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.License')}>
            <Chip
              label={t(CONTRACT_LABEL_BY_CONTRACT[PlatformContract.Trial])}
            />
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.Remaining')}>
            {remainingDays !== null ? (
              <Chip
                label={t('XtmPlatformTrial.BundleInfo.DaysRemaining', {
                  days: remainingDays,
                })}
                severity="low"
              />
            ) : (
              '-'
            )}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.TrialRequester')}>
            {bundle.requester_email ?? '-'}
          </InfoRow>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center justify-end gap-2 mt-auto">
            <Button
              {...analyticsId('trial_cancellation_open')}
              variant="destructive"
              priority="secondary"
              onClick={() => setOpenCancel(true)}>
              {t('XtmPlatformTrial.CancelTrial')}
            </Button>
            <Button asChild>
              <Link
                {...analyticsId('trial_users_open')}
                href={xtmPlatformTrialManageUsersPath(
                  bundle.service_instance_id
                )}>
                {t('Service.Trials.ManageUsers.Title')}
              </Link>
            </Button>
            <BundleCancelSheet
              deploymentRequestId={bundle.id}
              open={openCancel}
              setOpen={setOpenCancel}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
