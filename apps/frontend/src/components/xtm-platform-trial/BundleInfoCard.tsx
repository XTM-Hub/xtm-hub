'use client';

import { CONTRACT_LABEL_BY_CONTRACT } from '@/components/registration/PlatformIdentifierMapping';
import { BundleCancelSheet } from '@/components/xtm-platform-trial/BundleCancelSheet';
import { daysUntil, useDateFormatter } from '@/utils/date';
import { xtmPlatformTrialManageUsersPath } from '@/utils/path/constant';
import { Badge, Button, Card, CardContent } from '@filigran/ui';
import {
  PlatformContract,
  XtmPlatformBundleDetailsFragment,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
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
  <div className="flex items-center justify-between gap-s py-l">
    <span className="text-content-body-base text-text-default-secondary">
      {label}:
    </span>
    <span className="text-content-body-compact truncate">{children}</span>
  </div>
);

export const BundleInfoCard = ({ bundle, canManage }: BundleInfoCardProps) => {
  const t = useTranslations();
  const formatDate = useDateFormatter();
  const [openCancel, setOpenCancel] = useState(false);

  const remainingDays = bundle.end_date
    ? Math.max(daysUntil(new Date(bundle.end_date)), 0)
    : null;

  return (
    <Card className="h-full bg-elevation-background-layer-2">
      <CardContent className="p-4 flex flex-col gap-m h-full">
        <div className="flex items-center gap-xs min-w-0">
          <span className="text-content-body-large-medium truncate">
            {t('XtmPlatformTrial.BundleInfo.Title')}
          </span>
        </div>
        <div className="flex flex-col divide-y divide-elevation-border-subtle-layer-2">
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.OrganizationName')}>
            {bundle.organization_name ?? '-'}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.StartedOn')}>
            {formatDate(bundle.start_date ?? undefined, 'DATE_FULL') ?? '-'}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.License')}>
            <Badge className="bg-elevation-surface-highlight-layer-2 border-none">
              {t(CONTRACT_LABEL_BY_CONTRACT[PlatformContract.Trial])}
            </Badge>
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.Remaining')}>
            {remainingDays !== null ? (
              <Badge className="border-none bg-feedback-success-secondary-transparency text-content-body-base text-text-default-primary truncate">
                {t('XtmPlatformTrial.BundleInfo.DaysRemaining', {
                  days: remainingDays,
                })}
              </Badge>
            ) : (
              '-'
            )}
          </InfoRow>
          <InfoRow label={t('XtmPlatformTrial.BundleInfo.TrialRequester')}>
            {bundle.requester_email ?? '-'}
          </InfoRow>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center justify-end gap-s mt-auto">
            <Button
              variant="outline-destructive"
              onClick={() => setOpenCancel(true)}>
              {t('XtmPlatformTrial.CancelTrial')}
            </Button>
            <Button asChild>
              <Link
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
