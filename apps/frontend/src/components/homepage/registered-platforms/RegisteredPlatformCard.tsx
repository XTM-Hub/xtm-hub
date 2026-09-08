'use client';

import { HomepageRegisteredPlatformCardViewModel } from '@/components/homepage/Homepage.utils';
import {
  CONTRACT_LABEL_BY_CONTRACT,
  PlatformMetadataMapping,
} from '@/components/registration/PlatformIdentifierMapping';
import { cn } from '@/lib/utils';
import { useDateFormatter } from '@/utils/date';
import {
  Badge,
  Card,
  CardContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { PlatformContract } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

type RegisteredPlatformCardProps = {
  platform: HomepageRegisteredPlatformCardViewModel;
};

const TRIAL_DAYS_ERROR_THRESHOLD = 8;
const TRIAL_DAYS_WARNING_THRESHOLD = 22;

const resolveTrialDaysBadgeClassName = (
  remainingTrialDays: number | undefined
): string => {
  if (remainingTrialDays === undefined) {
    return 'bg-feedback-success-secondary-transparency';
  }

  if (remainingTrialDays <= TRIAL_DAYS_ERROR_THRESHOLD) {
    return 'bg-feedback-error-secondary-transparency';
  }

  if (remainingTrialDays <= TRIAL_DAYS_WARNING_THRESHOLD) {
    return 'bg-feedback-alert-secondary-transparency';
  }

  return 'bg-feedback-success-secondary-transparency';
};

const RegisteredPlatformCard = ({ platform }: RegisteredPlatformCardProps) => {
  const tRegisteredPlatformsCard = useTranslations(
    'HomePage.RegisteredPlatformsCard'
  );
  const t = useTranslations();
  const formatDate = useDateFormatter();

  const registrationDate = platform.registrationDate
    ? formatDate(platform.registrationDate, 'DATE_MEDIUM')
    : '-';

  const remainingTrialDaysBadgeClassName = resolveTrialDaysBadgeClassName(
    platform.remainingTrialDays
  );
  const gradientFrom = 'var(--color-filigran-brand-primary)';
  const gradientTo = 'var(--color-filigran-tonic-primary)';
  const gradientBg = 'hsl(var(--background))';
  const customStyle = {
    '--gradient-from': gradientFrom,
    '--gradient-to': gradientTo,
    '--gradient-bg': gradientBg,
  } as React.CSSProperties;

  const { Icon } = PlatformMetadataMapping[platform.platformIdentifier];
  const contractLabel = CONTRACT_LABEL_BY_CONTRACT[platform.contract];

  const cardContent = (
    <Card
      className={cn(
        'border pt-s my-xs bg-elevation-background-layer-1 border-elevation-border-subtle-layer-1',
        platform.href && 'cursor-pointer hover:bg-hover'
      )}>
      <CardContent className="p-s flex flex-col gap-m">
        <div className="flex gap-s items-center justify-between">
          <div className="flex gap-s items-center min-w-0 flex-1">
            <Badge className="border-none font-medium bg-feedback-info-secondary-transparency shrink-0">
              <div className="flex gap-s">
                <span>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-content-body-compact-medium">
                  {PlatformMetadataMapping[platform.platformIdentifier].name}
                </span>
              </div>
            </Badge>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-content-body-compact truncate min-w-0">
                    {platform.title}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{platform.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-content-body-compact shrink-0">
            <span className="text-muted-foreground">
              {tRegisteredPlatformsCard('RegisteredOn')}
            </span>{' '}
            {registrationDate}
          </p>
        </div>
        <div className="text-content-body-compact-medium flex gap-l items-center">
          {platform.contract === PlatformContract.Ee ? (
            <Badge
              className={cn(
                'border-2 border-transparent',
                '[background:linear-gradient(var(--gradient-bg),var(--gradient-bg))_padding-box,linear-gradient(99.95deg,var(--gradient-from)_0%,var(--gradient-to)_100%)_border-box]'
              )}
              style={customStyle}>
              <span className="bg-linear-to-r from-(--gradient-from) to-(--gradient-to) bg-clip-text text-transparent">
                {t(contractLabel)}
              </span>
            </Badge>
          ) : (
            <Badge className="bg-elevation-surface-highlight-layer-1 border-none">
              {t(contractLabel)}
            </Badge>
          )}
          {platform.contract === PlatformContract.Trial &&
            platform.remainingTrialDays !== undefined && (
              <div className="flex gap-s items-center text-content-body-compact text-text-default-secondary">
                <p>{tRegisteredPlatformsCard('Remaining')}</p>
                <Badge
                  className={cn(
                    'border-none text-content-body-compact-medium text-text-default-primary',
                    remainingTrialDaysBadgeClassName
                  )}>
                  {tRegisteredPlatformsCard('DaysRemaining', {
                    days: platform.remainingTrialDays,
                  })}
                </Badge>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );

  return platform.href ? (
    <Link
      href={platform.href}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {cardContent}
    </Link>
  ) : (
    cardContent
  );
};

export default RegisteredPlatformCard;
